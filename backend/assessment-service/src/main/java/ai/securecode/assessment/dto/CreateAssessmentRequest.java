package ai.securecode.assessment.dto;

import java.util.UUID;

public record CreateAssessmentRequest(
        String name,
        UUID templateId,
        String scoringConfig,
        String proctoringLevel
) {}
