package ai.securecode.assessment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record SubmitCodeRequest(
        @NotNull UUID questionId,
        @NotBlank String language,
        @NotBlank String code
) {}
