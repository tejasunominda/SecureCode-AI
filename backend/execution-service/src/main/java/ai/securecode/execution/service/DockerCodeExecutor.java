package ai.securecode.execution.service;

import ai.securecode.execution.dto.ExecuteRequest;
import ai.securecode.execution.dto.ExecuteResponse;
import com.github.dockerjava.api.DockerClient;
import com.github.dockerjava.api.command.CreateContainerResponse;
import com.github.dockerjava.api.command.WaitContainerResultCallback;
import com.github.dockerjava.api.model.Bind;
import com.github.dockerjava.api.model.HostConfig;
import com.github.dockerjava.api.model.Volume;
import com.github.dockerjava.core.DefaultDockerClientConfig;
import com.github.dockerjava.core.DockerClientImpl;
import com.github.dockerjava.httpclient5.ApacheDockerHttpClient;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
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
        return switch (req.language().toLowerCase()) {
            case "python", "python3" -> executeInContainer(req, "python:3.12-slim", "python3", "/tmp/solution.py");
            case "javascript", "js" -> executeInContainer(req, "node:20-alpine", "node", "/tmp/solution.js");
            case "java" -> executeJavaInContainer(req);
            case "cpp", "c++" -> executeCompiledInContainer(req, "gcc:14-bookworm", "g++", "-o", "/tmp/solution", "/tmp/solution.cpp");
            case "c" -> executeCompiledInContainer(req, "gcc:14-bookworm", "gcc", "-o", "/tmp/solution", "/tmp/solution.c");
            case "sql" -> executeSqlInContainer(req);
            default -> ExecuteResponse.error("Unsupported language: " + req.language());
        };
    }

    private ExecuteResponse executeInContainer(ExecuteRequest req, String image, String runCmd, String filePath) {
        Path tmpDir;
        try {
            tmpDir = Files.createTempDirectory("securecode-exec");
            String fileName = filePath.substring(filePath.lastIndexOf("/") + 1);
            Files.writeString(tmpDir.resolve(fileName), req.code());
        } catch (IOException e) {
            return ExecuteResponse.error("Failed to prepare execution: " + e.getMessage());
        }

        try {
            HostConfig hostConfig = HostConfig.newHostConfig()
                    .withMemory(memoryLimitMb * 1024 * 1024)
                    .withCpuCount(1L)
                    .withNetworkMode("none")
                    .withReadonlyRootfs(false)
                    .withBinds(new Bind(tmpDir.toString(), new Volume("/tmp")));

            CreateContainerResponse container = dockerClient.createContainerCmd(image)
                    .withCmd(runCmd, filePath)
                    .withHostConfig(hostConfig)
                    .withWorkingDir("/tmp")
                    .exec();

            dockerClient.startContainerCmd(container.getId()).exec();

            boolean finished = dockerClient.waitContainerCmd(container.getId())
                    .exec(new WaitContainerResultCallback())
                    .awaitCompletion(wallClockTimeoutMs, TimeUnit.MILLISECONDS);

            if (!finished) {
                dockerClient.killContainerCmd(container.getId()).exec();
                cleanup(tmpDir);
                return ExecuteResponse.timeout("Process exceeded " + wallClockTimeoutMs + "ms wall-clock limit");
            }

            int waitResult =
                    dockerClient.waitContainerCmd(container.getId()).exec(new WaitContainerResultCallback()).awaitStatusCode();

            String stdout = readContainerLogs(container.getId(), true);
            String stderr = readContainerLogs(container.getId(), false);
            int exitCode = waitResult;

            dockerClient.removeContainerCmd(container.getId()).withForce(true).exec();
            cleanup(tmpDir);

            return ExecuteResponse.success(stdout, stderr, exitCode, 0);
        } catch (Exception e) {
            cleanup(tmpDir);
            return ExecuteResponse.error("Execution failed: " + e.getMessage());
        }
    }

    private ExecuteResponse executeJavaInContainer(ExecuteRequest req) {
        Path tmpDir;
        try {
            tmpDir = Files.createTempDirectory("securecode-exec");
            Files.writeString(tmpDir.resolve("Solution.java"), req.code());
        } catch (IOException e) {
            return ExecuteResponse.error("Failed to prepare execution: " + e.getMessage());
        }

        try {
            HostConfig hostConfig = HostConfig.newHostConfig()
                    .withMemory(memoryLimitMb * 1024 * 1024)
                    .withCpuCount(1L)
                    .withNetworkMode("none")
                    .withBinds(new Bind(tmpDir.toString(), new Volume("/tmp")));

            CreateContainerResponse compileContainer = dockerClient.createContainerCmd("openjdk:21-slim")
                    .withCmd("javac", "/tmp/Solution.java")
                    .withHostConfig(hostConfig)
                    .withWorkingDir("/tmp")
                    .exec();

            dockerClient.startContainerCmd(compileContainer.getId()).exec();
            boolean compiled = dockerClient.waitContainerCmd(compileContainer.getId())
                    .exec(new WaitContainerResultCallback())
                    .awaitCompletion(wallClockTimeoutMs, TimeUnit.MILLISECONDS);

            if (!compiled) {
                dockerClient.killContainerCmd(compileContainer.getId()).exec();
                dockerClient.removeContainerCmd(compileContainer.getId()).withForce(true).exec();
                cleanup(tmpDir);
                return ExecuteResponse.timeout("Compilation exceeded " + wallClockTimeoutMs + "ms wall-clock limit");
            }

            int compileResult =
                    dockerClient.waitContainerCmd(compileContainer.getId()).exec(new WaitContainerResultCallback()).awaitStatusCode();

            if (compileResult != 0) {
                String compileErr = readContainerLogs(compileContainer.getId(), false);
                dockerClient.removeContainerCmd(compileContainer.getId()).withForce(true).exec();
                cleanup(tmpDir);
                return ExecuteResponse.success("", compileErr, compileResult, 0);
            }

            dockerClient.removeContainerCmd(compileContainer.getId()).withForce(true).exec();

            CreateContainerResponse runContainer = dockerClient.createContainerCmd("openjdk:21-slim")
                    .withCmd("java", "-cp", "/tmp", "Solution")
                    .withHostConfig(hostConfig)
                    .withWorkingDir("/tmp")
                    .exec();

            dockerClient.startContainerCmd(runContainer.getId()).exec();
            boolean finished = dockerClient.waitContainerCmd(runContainer.getId())
                    .exec(new WaitContainerResultCallback())
                    .awaitCompletion(wallClockTimeoutMs, TimeUnit.MILLISECONDS);

            if (!finished) {
                dockerClient.killContainerCmd(runContainer.getId()).exec();
                dockerClient.removeContainerCmd(runContainer.getId()).withForce(true).exec();
                cleanup(tmpDir);
                return ExecuteResponse.timeout("Process exceeded " + wallClockTimeoutMs + "ms wall-clock limit");
            }

            int runResult =
                    dockerClient.waitContainerCmd(runContainer.getId()).exec(new WaitContainerResultCallback()).awaitStatusCode();

            String stdout = readContainerLogs(runContainer.getId(), true);
            String stderr = readContainerLogs(runContainer.getId(), false);

            dockerClient.removeContainerCmd(runContainer.getId()).withForce(true).exec();
            cleanup(tmpDir);

            return ExecuteResponse.success(stdout, stderr, runResult, 0);
        } catch (Exception e) {
            cleanup(tmpDir);
            return ExecuteResponse.error("Execution failed: " + e.getMessage());
        }
    }

    private ExecuteResponse executeCompiledInContainer(ExecuteRequest req, String image,
                                                        String compiler, String... compileArgs) {
        Path tmpDir;
        try {
            tmpDir = Files.createTempDirectory("securecode-exec");
            String srcFile = compileArgs[compileArgs.length - 1];
            String fileName = srcFile.substring(srcFile.lastIndexOf("/") + 1);
            Files.writeString(tmpDir.resolve(fileName), req.code());
        } catch (IOException e) {
            return ExecuteResponse.error("Failed to prepare execution: " + e.getMessage());
        }

        try {
            HostConfig hostConfig = HostConfig.newHostConfig()
                    .withMemory(memoryLimitMb * 1024 * 1024)
                    .withCpuCount(1L)
                    .withNetworkMode("none")
                    .withBinds(new Bind(tmpDir.toString(), new Volume("/tmp")));

            String[] compileCmd = new String[compileArgs.length + 1];
            compileCmd[0] = compiler;
            System.arraycopy(compileArgs, 0, compileCmd, 1, compileArgs.length);

            CreateContainerResponse compileContainer = dockerClient.createContainerCmd(image)
                    .withCmd(compileCmd)
                    .withHostConfig(hostConfig)
                    .withWorkingDir("/tmp")
                    .exec();

            dockerClient.startContainerCmd(compileContainer.getId()).exec();
            boolean compiled = dockerClient.waitContainerCmd(compileContainer.getId())
                    .exec(new WaitContainerResultCallback())
                    .awaitCompletion(wallClockTimeoutMs, TimeUnit.MILLISECONDS);

            if (!compiled) {
                dockerClient.killContainerCmd(compileContainer.getId()).exec();
                dockerClient.removeContainerCmd(compileContainer.getId()).withForce(true).exec();
                cleanup(tmpDir);
                return ExecuteResponse.timeout("Compilation exceeded " + wallClockTimeoutMs + "ms wall-clock limit");
            }

            int compileResult =
                    dockerClient.waitContainerCmd(compileContainer.getId()).exec(new WaitContainerResultCallback()).awaitStatusCode();

            if (compileResult != 0) {
                String compileErr = readContainerLogs(compileContainer.getId(), false);
                dockerClient.removeContainerCmd(compileContainer.getId()).withForce(true).exec();
                cleanup(tmpDir);
                return ExecuteResponse.success("", compileErr, compileResult, 0);
            }

            dockerClient.removeContainerCmd(compileContainer.getId()).withForce(true).exec();

            CreateContainerResponse runContainer = dockerClient.createContainerCmd(image)
                    .withCmd("/tmp/solution")
                    .withHostConfig(hostConfig)
                    .withWorkingDir("/tmp")
                    .exec();

            dockerClient.startContainerCmd(runContainer.getId()).exec();
            boolean finished = dockerClient.waitContainerCmd(runContainer.getId())
                    .exec(new WaitContainerResultCallback())
                    .awaitCompletion(wallClockTimeoutMs, TimeUnit.MILLISECONDS);

            if (!finished) {
                dockerClient.killContainerCmd(runContainer.getId()).exec();
                dockerClient.removeContainerCmd(runContainer.getId()).withForce(true).exec();
                cleanup(tmpDir);
                return ExecuteResponse.timeout("Process exceeded " + wallClockTimeoutMs + "ms wall-clock limit");
            }

            int runResult =
                    dockerClient.waitContainerCmd(runContainer.getId()).exec(new WaitContainerResultCallback()).awaitStatusCode();

            String stdout = readContainerLogs(runContainer.getId(), true);
            String stderr = readContainerLogs(runContainer.getId(), false);

            dockerClient.removeContainerCmd(runContainer.getId()).withForce(true).exec();
            cleanup(tmpDir);

            return ExecuteResponse.success(stdout, stderr, runResult, 0);
        } catch (Exception e) {
            cleanup(tmpDir);
            return ExecuteResponse.error("Execution failed: " + e.getMessage());
        }
    }

    private ExecuteResponse executeSqlInContainer(ExecuteRequest req) {
        Path tmpDir;
        try {
            tmpDir = Files.createTempDirectory("securecode-exec");
            Files.writeString(tmpDir.resolve("solution.sql"), req.code());
        } catch (IOException e) {
            return ExecuteResponse.error("Failed to prepare execution: " + e.getMessage());
        }

        try {
            HostConfig hostConfig = HostConfig.newHostConfig()
                    .withMemory(memoryLimitMb * 1024 * 1024)
                    .withCpuCount(1L)
                    .withNetworkMode("none")
                    .withBinds(new Bind(tmpDir.toString(), new Volume("/tmp")));

            CreateContainerResponse container = dockerClient.createContainerCmd("postgres:16-alpine")
                    .withCmd("psql", "-c", "\\i /tmp/solution.sql")
                    .withHostConfig(hostConfig)
                    .exec();

            dockerClient.startContainerCmd(container.getId()).exec();
            boolean finished = dockerClient.waitContainerCmd(container.getId())
                    .exec(new WaitContainerResultCallback())
                    .awaitCompletion(wallClockTimeoutMs, TimeUnit.MILLISECONDS);

            if (!finished) {
                dockerClient.killContainerCmd(container.getId()).exec();
                dockerClient.removeContainerCmd(container.getId()).withForce(true).exec();
                cleanup(tmpDir);
                return ExecuteResponse.timeout("Process exceeded " + wallClockTimeoutMs + "ms wall-clock limit");
            }

            int result =
                    dockerClient.waitContainerCmd(container.getId()).exec(new WaitContainerResultCallback()).awaitStatusCode();

            String stdout = readContainerLogs(container.getId(), true);
            String stderr = readContainerLogs(container.getId(), false);

            dockerClient.removeContainerCmd(container.getId()).withForce(true).exec();
            cleanup(tmpDir);

            return ExecuteResponse.success(stdout, stderr, result, 0);
        } catch (Exception e) {
            cleanup(tmpDir);
            return ExecuteResponse.error("Execution failed: " + e.getMessage());
        }
    }

    private String readContainerLogs(String containerId, boolean stdout) {
        try {
            com.github.dockerjava.core.command.LogContainerResultCallback callback = new com.github.dockerjava.core.command.LogContainerResultCallback();
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
            return callback.toString();
        } catch (Exception e) {
            return "";
        }
    }

    private void cleanup(Path dir) {
        try {
            Files.walk(dir)
                    .sorted((a, b) -> b.compareTo(a))
                    .forEach(p -> {
                        try { Files.deleteIfExists(p); } catch (IOException ignored) {}
                    });
        } catch (IOException ignored) {}
    }
}
