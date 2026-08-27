package ai.securecode.execution.service;

import ai.securecode.execution.dto.ExecuteRequest;
import ai.securecode.execution.dto.ExecuteResponse;
import com.github.dockerjava.api.DockerClient;
import com.github.dockerjava.api.command.CreateContainerResponse;
import com.github.dockerjava.api.command.WaitContainerResultCallback;
import com.github.dockerjava.api.model.Capability;
import com.github.dockerjava.api.model.HostConfig;
import com.github.dockerjava.core.DefaultDockerClientConfig;
import com.github.dockerjava.core.DockerClientImpl;
import com.github.dockerjava.core.command.LogContainerResultCallback;
import com.github.dockerjava.httpclient5.ApacheDockerHttpClient;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.concurrent.TimeUnit;

/**
 * Docker-sandboxed code executor (FR-EDIT-03). Each execution runs in an
 * ephemeral, network-isolated container with CPU, memory, and wall-clock limits.
 */
@Service
public class DockerCodeExecutor {

    @Value("${execution.docker-host:unix:///var/run/docker.sock}")
    private String dockerHost;

    @Value("${execution.default-cpu-limit:1.0}")
    private String cpuLimit;

    @Value("${execution.default-memory-limit-mb:256}")
    private long memoryLimitMb;

    @Value("${execution.default-wall-clock-timeout-ms:5000}")
    private long wallClockTimeoutMs;

    private DockerClient dockerClient;

    @PostConstruct
    void init() {
        DefaultDockerClientConfig config = DefaultDockerClientConfig.createDefaultConfigBuilder()
                .withDockerHost(dockerHost)
                .build();
        ApacheDockerHttpClient httpClient = new ApacheDockerHttpClient.Builder()
                .dockerHost(config.getDockerHost())
                .build();
        dockerClient = DockerClientImpl.getInstance(config, httpClient);
    }

    public ExecuteResponse execute(ExecuteRequest req) {
        ExecuteResponse rawResponse = switch (req.language().toLowerCase()) {
            case "python", "python3" -> executeInContainer(req, "python:3.12-slim", "python3", "/tmp/solution.py");
            case "javascript", "js" -> executeInContainer(req, "node:20-alpine", "node", "/tmp/solution.js");
            case "java" -> executeJavaInContainer(req);
            case "cpp", "c++" -> executeCompiledInContainer(req, "gcc:14-bookworm", "g++", "-o", "/tmp/solution", "/tmp/solution.cpp");
            case "c" -> executeCompiledInContainer(req, "gcc:14-bookworm", "gcc", "-o", "/tmp/solution", "/tmp/solution.c");
            case "sql" -> executeSqlInContainer(req);
            default -> ExecuteResponse.error("Unsupported language: " + req.language());
        };

        if (req.judgeType() != null && !"exact".equalsIgnoreCase(req.judgeType()) && "completed".equals(rawResponse.status())) {
            return applyCustomJudge(req, rawResponse);
        }
        return rawResponse;
    }

    private ExecuteResponse applyCustomJudge(ExecuteRequest req, ExecuteResponse rawResponse) {
        String judgeType = req.judgeType();
        String actual = rawResponse.stdout();
        String expected = req.expectedOutput() != null ? req.expectedOutput() : "";

        return switch (judgeType.toLowerCase()) {
            case "token" -> {
                String[] actualTokens = actual.trim().split("\\s+");
                String[] expectedTokens = expected.trim().split("\\s+");
                boolean passed = java.util.Arrays.equals(actualTokens, expectedTokens);
                yield new ExecuteResponse(actual, rawResponse.stderr(), rawResponse.exitCode(),
                        rawResponse.runtimeMs(), 0, "completed",
                        passed ? null : "Token mismatch: expected " + expectedTokens.length + " tokens, got " + actualTokens.length);
            }
            case "regex" -> {
                boolean passed = actual.trim().matches(expected.trim());
                yield new ExecuteResponse(actual, rawResponse.stderr(), rawResponse.exitCode(),
                        rawResponse.runtimeMs(), 0, "completed",
                        passed ? null : "Regex mismatch: output does not match pattern");
            }
            case "custom" -> {
                // SECURITY: see CodeExecutor.applyCustomJudge for rationale.
                // Custom judges are disabled until a properly sandboxed
                // (non-host-interop, resource-limited) script evaluator exists.
                yield new ExecuteResponse(actual, rawResponse.stderr(), rawResponse.exitCode(),
                        rawResponse.runtimeMs(), 0, "completed",
                        "Custom judge type is disabled: no sandboxed script evaluator is configured");
            }
            case "float_tolerance" -> {
                try {
                    double actualVal = Double.parseDouble(actual.trim());
                    double expectedVal = Double.parseDouble(expected.trim());
                    boolean passed = Math.abs(actualVal - expectedVal) < 1e-6;
                    yield new ExecuteResponse(actual, rawResponse.stderr(), rawResponse.exitCode(),
                            rawResponse.runtimeMs(), 0, "completed",
                            passed ? null : "Float tolerance mismatch");
                } catch (NumberFormatException e) {
                    yield new ExecuteResponse(actual, rawResponse.stderr(), rawResponse.exitCode(),
                            rawResponse.runtimeMs(), 0, "completed", "Float parse error: " + e.getMessage());
                }
            }
            default -> rawResponse;
        };
    }

    private ExecuteResponse executeInContainer(ExecuteRequest req, String image, String runCmd, String filePath) {
        try {
            String base64Code = Base64.getEncoder().encodeToString(req.code().getBytes(StandardCharsets.UTF_8));
            String shellScript = "printf '%s' '" + base64Code + "' | base64 -d > " + filePath
                    + " && " + runCmd + " " + filePath;

            HostConfig hostConfig = HostConfig.newHostConfig()
                    .withMemory(memoryLimitMb * 1024 * 1024)
                    .withCpuCount(1L)
                    .withNetworkMode("none")
                    .withReadonlyRootfs(false)
                    .withCapDrop(Capability.ALL)
                    .withPidsLimit(64L)
                    .withSecurityOpts(java.util.List.of("no-new-privileges"));

            CreateContainerResponse container = dockerClient.createContainerCmd(image)
                    .withCmd("sh", "-c", shellScript)
                    .withHostConfig(hostConfig)
                    .withWorkingDir("/tmp")
                    .exec();

            long startTime = System.nanoTime();
            dockerClient.startContainerCmd(container.getId()).exec();

            boolean finished = dockerClient.waitContainerCmd(container.getId())
                    .exec(new WaitContainerResultCallback())
                    .awaitCompletion(wallClockTimeoutMs, TimeUnit.MILLISECONDS);

            if (!finished) {
                dockerClient.killContainerCmd(container.getId()).exec();
                dockerClient.removeContainerCmd(container.getId()).withForce(true).exec();
                return ExecuteResponse.timeout("Process exceeded " + wallClockTimeoutMs + "ms wall-clock limit");
            }

            long runtimeMs = (System.nanoTime() - startTime) / 1_000_000;
            int waitResult =
                    dockerClient.waitContainerCmd(container.getId()).exec(new WaitContainerResultCallback()).awaitStatusCode();

            String stdout = readContainerLogs(container.getId(), true);
            String stderr = readContainerLogs(container.getId(), false);
            int exitCode = waitResult;

            dockerClient.removeContainerCmd(container.getId()).withForce(true).exec();

            return ExecuteResponse.success(stdout, stderr, exitCode, runtimeMs);
        } catch (Exception e) {
            return ExecuteResponse.error("Execution failed: " + e.getMessage());
        }
    }

    private ExecuteResponse executeJavaInContainer(ExecuteRequest req) {
        try {
            String base64Code = Base64.getEncoder().encodeToString(req.code().getBytes(StandardCharsets.UTF_8));
            String shellScript = "printf '%s' '" + base64Code + "' | base64 -d > /tmp/Solution.java"
                    + " && javac /tmp/Solution.java"
                    + " && java -cp /tmp Solution";

            HostConfig hostConfig = HostConfig.newHostConfig()
                    .withMemory(memoryLimitMb * 1024 * 1024)
                    .withCpuCount(1L)
                    .withNetworkMode("none")
                    .withReadonlyRootfs(false)
                    .withCapDrop(Capability.ALL)
                    .withPidsLimit(64L)
                    .withSecurityOpts(java.util.List.of("no-new-privileges"));

            CreateContainerResponse container = dockerClient.createContainerCmd("eclipse-temurin:21-jdk")
                    .withCmd("sh", "-c", shellScript)
                    .withHostConfig(hostConfig)
                    .withWorkingDir("/tmp")
                    .exec();

            long startTime = System.nanoTime();
            dockerClient.startContainerCmd(container.getId()).exec();
            boolean finished = dockerClient.waitContainerCmd(container.getId())
                    .exec(new WaitContainerResultCallback())
                    .awaitCompletion(wallClockTimeoutMs, TimeUnit.MILLISECONDS);

            if (!finished) {
                dockerClient.killContainerCmd(container.getId()).exec();
                dockerClient.removeContainerCmd(container.getId()).withForce(true).exec();
                return ExecuteResponse.timeout("Process exceeded " + wallClockTimeoutMs + "ms wall-clock limit");
            }

            long runtimeMs = (System.nanoTime() - startTime) / 1_000_000;
            int runResult =
                    dockerClient.waitContainerCmd(container.getId()).exec(new WaitContainerResultCallback()).awaitStatusCode();

            String stdout = readContainerLogs(container.getId(), true);
            String stderr = readContainerLogs(container.getId(), false);

            dockerClient.removeContainerCmd(container.getId()).withForce(true).exec();

            return ExecuteResponse.success(stdout, stderr, runResult, runtimeMs);
        } catch (Exception e) {
            return ExecuteResponse.error("Execution failed: " + e.getMessage());
        }
    }

    private ExecuteResponse executeCompiledInContainer(ExecuteRequest req, String image,
                                                        String compiler, String... compileArgs) {
        try {
            String srcFile = compileArgs[compileArgs.length - 1];
            int outputIndex = -1;
            for (int i = 0; i < compileArgs.length - 1; i++) {
                if ("-o".equals(compileArgs[i])) {
                    outputIndex = i + 1;
                    break;
                }
            }
            String binary = outputIndex >= 0 ? compileArgs[outputIndex] : "/tmp/solution";
            String compile = compiler + " " + java.util.Arrays.stream(compileArgs).collect(java.util.stream.Collectors.joining(" "));

            String base64Code = Base64.getEncoder().encodeToString(req.code().getBytes(StandardCharsets.UTF_8));
            String shellScript = "printf '%s' '" + base64Code + "' | base64 -d > " + srcFile
                    + " && " + compile
                    + " && " + binary;

            HostConfig hostConfig = HostConfig.newHostConfig()
                    .withMemory(memoryLimitMb * 1024 * 1024)
                    .withCpuCount(1L)
                    .withNetworkMode("none")
                    .withReadonlyRootfs(false)
                    .withCapDrop(Capability.ALL)
                    .withPidsLimit(64L)
                    .withSecurityOpts(java.util.List.of("no-new-privileges"));

            CreateContainerResponse container = dockerClient.createContainerCmd(image)
                    .withCmd("sh", "-c", shellScript)
                    .withHostConfig(hostConfig)
                    .withWorkingDir("/tmp")
                    .exec();

            long startTime = System.nanoTime();
            dockerClient.startContainerCmd(container.getId()).exec();
            boolean finished = dockerClient.waitContainerCmd(container.getId())
                    .exec(new WaitContainerResultCallback())
                    .awaitCompletion(wallClockTimeoutMs, TimeUnit.MILLISECONDS);

            if (!finished) {
                dockerClient.killContainerCmd(container.getId()).exec();
                dockerClient.removeContainerCmd(container.getId()).withForce(true).exec();
                return ExecuteResponse.timeout("Process exceeded " + wallClockTimeoutMs + "ms wall-clock limit");
            }

            long runtimeMs = (System.nanoTime() - startTime) / 1_000_000;
            int runResult =
                    dockerClient.waitContainerCmd(container.getId()).exec(new WaitContainerResultCallback()).awaitStatusCode();

            String stdout = readContainerLogs(container.getId(), true);
            String stderr = readContainerLogs(container.getId(), false);

            dockerClient.removeContainerCmd(container.getId()).withForce(true).exec();

            return ExecuteResponse.success(stdout, stderr, runResult, runtimeMs);
        } catch (Exception e) {
            return ExecuteResponse.error("Execution failed: " + e.getMessage());
        }
    }

    private ExecuteResponse executeSqlInContainer(ExecuteRequest req) {
        try {
            String base64Code = Base64.getEncoder().encodeToString(req.code().getBytes(StandardCharsets.UTF_8));
            String shellScript = "printf '%s' '" + base64Code + "' | base64 -d > /tmp/solution.sql"
                    + " && rm -rf /tmp/db"
                    + " && initdb -D /tmp/db -U postgres --auth=trust --no-locale"
                    + " && pg_ctl -D /tmp/db -l /tmp/pg.log -w start"
                    + " && psql -h 127.0.0.1 -U postgres -f /tmp/solution.sql";

            HostConfig hostConfig = HostConfig.newHostConfig()
                    .withMemory(memoryLimitMb * 1024 * 1024)
                    .withCpuCount(1L)
                    .withNetworkMode("none")
                    .withReadonlyRootfs(false)
                    .withCapDrop(Capability.ALL)
                    .withPidsLimit(64L)
                    .withSecurityOpts(java.util.List.of("no-new-privileges"));

            CreateContainerResponse container = dockerClient.createContainerCmd("postgres:16-alpine")
                    .withUser("postgres")
                    .withEntrypoint("sh", "-c", shellScript)
                    .withHostConfig(hostConfig)
                    .withWorkingDir("/tmp")
                    .exec();

            long sqlTimeoutMs = Math.max(wallClockTimeoutMs, 15000L);
            long startTime = System.nanoTime();
            dockerClient.startContainerCmd(container.getId()).exec();
            boolean finished = dockerClient.waitContainerCmd(container.getId())
                    .exec(new WaitContainerResultCallback())
                    .awaitCompletion(sqlTimeoutMs, TimeUnit.MILLISECONDS);

            if (!finished) {
                dockerClient.killContainerCmd(container.getId()).exec();
                dockerClient.removeContainerCmd(container.getId()).withForce(true).exec();
                return ExecuteResponse.timeout("Process exceeded " + wallClockTimeoutMs + "ms wall-clock limit");
            }

            long runtimeMs = (System.nanoTime() - startTime) / 1_000_000;
            int result =
                    dockerClient.waitContainerCmd(container.getId()).exec(new WaitContainerResultCallback()).awaitStatusCode();

            String stdout = readContainerLogs(container.getId(), true);
            String stderr = readContainerLogs(container.getId(), false);

            dockerClient.removeContainerCmd(container.getId()).withForce(true).exec();

            return ExecuteResponse.success(stdout, stderr, result, runtimeMs);
        } catch (Exception e) {
            return ExecuteResponse.error("Execution failed: " + e.getMessage());
        }
    }

    private String readContainerLogs(String containerId, boolean stdout) {
        try {
            StringBuilder output = new StringBuilder();
            LogContainerResultCallback callback = new LogContainerResultCallback() {
                @Override
                public void onNext(com.github.dockerjava.api.model.Frame frame) {
                    if (frame.getPayload() != null) {
                        output.append(new String(frame.getPayload(), StandardCharsets.UTF_8));
                    }
                }
            };
            if (stdout) {
                dockerClient.logContainerCmd(containerId)
                        .withStdOut(true)
                        .exec(callback)
                        .awaitCompletion();
            } else {
                dockerClient.logContainerCmd(containerId)
                        .withStdErr(true)
                        .exec(callback)
                        .awaitCompletion();
            }
            return output.toString();
        } catch (Exception e) {
            return "";
        }
    }

}
