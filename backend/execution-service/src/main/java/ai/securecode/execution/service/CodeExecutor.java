package ai.securecode.execution.service;

import ai.securecode.execution.dto.ExecuteRequest;
import ai.securecode.execution.dto.ExecuteResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;

@Service
public class CodeExecutor {

    @Value("${execution.default-wall-clock-timeout-ms:5000}")
    private long wallClockTimeoutMs;

    @Value("${execution.default-memory-limit-mb:256}")
    private int memoryLimitMb;

    public ExecuteResponse execute(ExecuteRequest req) {
        ExecuteResponse rawResponse = switch (req.language().toLowerCase()) {
            case "python", "python3" -> executePython(req);
            case "javascript", "js" -> executeJavaScript(req);
            case "java" -> executeJava(req);
            case "cpp", "c++" -> executeCpp(req);
            case "c" -> executeC(req);
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
                if (req.judgeCode() == null || req.judgeCode().isBlank()) {
                    yield new ExecuteResponse(actual, rawResponse.stderr(), rawResponse.exitCode(),
                            rawResponse.runtimeMs(), 0, "completed", "Custom judge code missing");
                }
                try {
                    javax.script.ScriptEngine engine = new javax.script.ScriptEngineManager().getEngineByName("javascript");
                    if (engine == null) {
                        yield new ExecuteResponse(actual, rawResponse.stderr(), rawResponse.exitCode(),
                                rawResponse.runtimeMs(), 0, "completed", "JavaScript engine not available for custom judge");
                    }
                    engine.eval(req.judgeCode());
                    Object result = engine.eval("judge(" +
                            java.util.Objects.requireNonNull(actual).replace("\\", "\\\\").replace("'", "\\'") +
                            ", " +
                            expected.replace("\\", "\\\\").replace("'", "\\'") + ")");
                    boolean passed = Boolean.TRUE.equals(result);
                    yield new ExecuteResponse(actual, rawResponse.stderr(), rawResponse.exitCode(),
                            rawResponse.runtimeMs(), 0, "completed",
                            passed ? null : "Custom judge rejected output");
                } catch (Exception e) {
                    yield new ExecuteResponse(actual, rawResponse.stderr(), rawResponse.exitCode(),
                            rawResponse.runtimeMs(), 0, "completed", "Custom judge error: " + e.getMessage());
                }
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

    private ExecuteResponse executePython(ExecuteRequest req) {
        try {
            Path tmpDir = Files.createTempDirectory("securecode-exec");
            Path scriptPath = tmpDir.resolve("solution.py");
            Files.writeString(scriptPath, req.code());

            ProcessBuilder pb = new ProcessBuilder("python3", "solution.py");
            pb.directory(tmpDir.toFile());
            pb.redirectErrorStream(false);

            long startTime = System.nanoTime();
            Process process = pb.start();
            if (req.stdin() != null && !req.stdin().isBlank()) {
                try (OutputStream os = process.getOutputStream()) {
                    os.write(req.stdin().getBytes());
                    os.flush();
                }
            }

            boolean finished = process.waitFor(wallClockTimeoutMs, TimeUnit.MILLISECONDS);
            if (!finished) {
                process.destroyForcibly();
                cleanup(tmpDir);
                return ExecuteResponse.timeout("Process exceeded " + wallClockTimeoutMs + "ms wall-clock limit");
            }

            long runtimeMs = (System.nanoTime() - startTime) / 1_000_000;
            String stdout = readStream(process.getInputStream());
            String stderr = readStream(process.getErrorStream());
            int exitCode = process.exitValue();
            cleanup(tmpDir);
            return ExecuteResponse.success(stdout, stderr, exitCode, runtimeMs);
        } catch (Exception e) {
            return ExecuteResponse.error("Execution failed: " + e.getMessage());
        }
    }

    private ExecuteResponse executeJavaScript(ExecuteRequest req) {
        try {
            Path tmpDir = Files.createTempDirectory("securecode-exec");
            Path scriptPath = tmpDir.resolve("solution.js");
            Files.writeString(scriptPath, req.code());

            ProcessBuilder pb = new ProcessBuilder("node", "solution.js");
            pb.directory(tmpDir.toFile());
            pb.redirectErrorStream(false);

            long startTime = System.nanoTime();
            Process process = pb.start();
            if (req.stdin() != null && !req.stdin().isBlank()) {
                try (OutputStream os = process.getOutputStream()) {
                    os.write(req.stdin().getBytes());
                    os.flush();
                }
            }

            boolean finished = process.waitFor(wallClockTimeoutMs, TimeUnit.MILLISECONDS);
            if (!finished) {
                process.destroyForcibly();
                cleanup(tmpDir);
                return ExecuteResponse.timeout("Process exceeded " + wallClockTimeoutMs + "ms wall-clock limit");
            }

            long runtimeMs = (System.nanoTime() - startTime) / 1_000_000;
            String stdout = readStream(process.getInputStream());
            String stderr = readStream(process.getErrorStream());
            int exitCode = process.exitValue();
            cleanup(tmpDir);
            return ExecuteResponse.success(stdout, stderr, exitCode, runtimeMs);
        } catch (Exception e) {
            return ExecuteResponse.error("Execution failed: " + e.getMessage());
        }
    }

    private ExecuteResponse executeJava(ExecuteRequest req) {
        try {
            Path tmpDir = Files.createTempDirectory("securecode-exec");
            Path srcPath = tmpDir.resolve("Solution.java");
            Files.writeString(srcPath, req.code());

            ProcessBuilder compilePb = new ProcessBuilder("javac", "Solution.java");
            compilePb.directory(tmpDir.toFile());
            compilePb.redirectErrorStream(true);
            Process compileProc = compilePb.start();
            boolean compiled = compileProc.waitFor(wallClockTimeoutMs, TimeUnit.MILLISECONDS);
            if (!compiled) {
                compileProc.destroyForcibly();
                cleanup(tmpDir);
                return ExecuteResponse.timeout("Compilation exceeded " + wallClockTimeoutMs + "ms wall-clock limit");
            }
            if (compileProc.exitValue() != 0) {
                String compileErr = readStream(compileProc.getInputStream());
                cleanup(tmpDir);
                return ExecuteResponse.success("", compileErr, compileProc.exitValue(), 0);
            }

            ProcessBuilder runPb = new ProcessBuilder("java", "Solution");
            runPb.directory(tmpDir.toFile());
            runPb.redirectErrorStream(false);
            long startTime = System.nanoTime();
            Process process = runPb.start();
            if (req.stdin() != null && !req.stdin().isBlank()) {
                try (OutputStream os = process.getOutputStream()) {
                    os.write(req.stdin().getBytes());
                    os.flush();
                }
            }

            boolean finished = process.waitFor(wallClockTimeoutMs, TimeUnit.MILLISECONDS);
            if (!finished) {
                process.destroyForcibly();
                cleanup(tmpDir);
                return ExecuteResponse.timeout("Process exceeded " + wallClockTimeoutMs + "ms wall-clock limit");
            }

            long runtimeMs = (System.nanoTime() - startTime) / 1_000_000;
            String stdout = readStream(process.getInputStream());
            String stderr = readStream(process.getErrorStream());
            int exitCode = process.exitValue();
            cleanup(tmpDir);
            return ExecuteResponse.success(stdout, stderr, exitCode, runtimeMs);
        } catch (Exception e) {
            return ExecuteResponse.error("Execution failed: " + e.getMessage());
        }
    }

    private ExecuteResponse executeCpp(ExecuteRequest req) {
        return executeCompiled(req, "cpp", "solution.cpp", "g++", "-o", "solution", "solution.cpp", "./solution");
    }

    private ExecuteResponse executeC(ExecuteRequest req) {
        return executeCompiled(req, "c", "solution.c", "gcc", "-o", "solution", "solution.c", "./solution");
    }

    private ExecuteResponse executeCompiled(ExecuteRequest req, String ext, String fileName,
                                            String compiler, String... compileArgs) {
        try {
            Path tmpDir = Files.createTempDirectory("securecode-exec");
            Path srcPath = tmpDir.resolve(fileName);
            Files.writeString(srcPath, req.code());

            String[] compileCmd = new String[compileArgs.length + 1];
            compileCmd[0] = compiler;
            System.arraycopy(compileArgs, 0, compileCmd, 1, compileArgs.length);

            ProcessBuilder compilePb = new ProcessBuilder(compileCmd);
            compilePb.directory(tmpDir.toFile());
            compilePb.redirectErrorStream(true);
            Process compileProc = compilePb.start();
            boolean compiled = compileProc.waitFor(wallClockTimeoutMs, TimeUnit.MILLISECONDS);
            if (!compiled) {
                compileProc.destroyForcibly();
                cleanup(tmpDir);
                return ExecuteResponse.timeout("Compilation exceeded " + wallClockTimeoutMs + "ms wall-clock limit");
            }
            if (compileProc.exitValue() != 0) {
                String compileErr = readStream(compileProc.getInputStream());
                cleanup(tmpDir);
                return ExecuteResponse.success("", compileErr, compileProc.exitValue(), 0);
            }

            String runCmd = compileArgs[compileArgs.length - 1];
            ProcessBuilder runPb = new ProcessBuilder(runCmd.startsWith("./") ? runCmd : "./" + runCmd);
            runPb.directory(tmpDir.toFile());
            runPb.redirectErrorStream(false);
            long startTime = System.nanoTime();
            Process process = runPb.start();
            if (req.stdin() != null && !req.stdin().isBlank()) {
                try (OutputStream os = process.getOutputStream()) {
                    os.write(req.stdin().getBytes());
                    os.flush();
                }
            }

            boolean finished = process.waitFor(wallClockTimeoutMs, TimeUnit.MILLISECONDS);
            if (!finished) {
                process.destroyForcibly();
                cleanup(tmpDir);
                return ExecuteResponse.timeout("Process exceeded " + wallClockTimeoutMs + "ms wall-clock limit");
            }

            long runtimeMs = (System.nanoTime() - startTime) / 1_000_000;
            String stdout = readStream(process.getInputStream());
            String stderr = readStream(process.getErrorStream());
            int exitCode = process.exitValue();
            cleanup(tmpDir);
            return ExecuteResponse.success(stdout, stderr, exitCode, runtimeMs);
        } catch (Exception e) {
            return ExecuteResponse.error("Execution failed: " + e.getMessage());
        }
    }

    private String readStream(InputStream is) throws IOException {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(is))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                if (sb.length() > 0) sb.append("\n");
                sb.append(line);
            }
            return sb.toString();
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
