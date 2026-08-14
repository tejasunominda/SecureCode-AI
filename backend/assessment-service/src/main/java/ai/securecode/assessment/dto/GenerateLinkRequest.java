package ai.securecode.assessment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record GenerateLinkRequest(
        @NotNull UUID applicantId,
        @NotNull UUID templateId,
        int expiryDays
) {}
