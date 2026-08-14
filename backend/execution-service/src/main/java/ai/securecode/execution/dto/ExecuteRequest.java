package ai.securecode.execution.dto;

import jakarta.validation.constraints.NotBlank;

public record ExecuteRequest(
        @NotBlank String language,
        @NotBlank String code,
        String stdin,
        String expectedOutput,
        String judgeType,
        String judgeCode
) {}
