package ai.securecode.assessment.dto;

public record ExecutionRunRequest(
        String language,
        String code,
        String stdin,
        String expectedOutput,
        String judgeType,
        String judgeCode
) {}
