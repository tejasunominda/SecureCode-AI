package ai.securecode.assessment.dto;

import jakarta.validation.constraints.NotBlank;

public record ProctoringEventRequest(
        @NotBlank String eventType,
        String screenshotData,
        String audioData,
        String detail
) {}
