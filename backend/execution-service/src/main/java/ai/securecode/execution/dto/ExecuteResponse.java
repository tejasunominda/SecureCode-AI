package ai.securecode.execution.dto;

public record ExecuteResponse(
        String stdout,
        String stderr,
        int exitCode,
        long runtimeMs,
        long memoryKb,
        String status,
        String error
) {
    public static ExecuteResponse success(String stdout, String stderr, int exitCode, long runtimeMs) {
        return new ExecuteResponse(stdout, stderr, exitCode, runtimeMs, 0, "completed", null);
    }

    public static ExecuteResponse timeout(String message) {
        return new ExecuteResponse("", "", -1, 0, 0, "timeout", message);
    }

    public static ExecuteResponse error(String message) {
        return new ExecuteResponse("", "", -1, 0, 0, "error", message);
    }
}
