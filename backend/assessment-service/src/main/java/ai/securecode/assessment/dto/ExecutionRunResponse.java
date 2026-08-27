package ai.securecode.assessment.dto;

public record ExecutionRunResponse(
        String stdout,
        String stderr,
        int exitCode,
        long runtimeMs,
        long memoryKb,
        String status,
        String error
) {}
