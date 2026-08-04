package ai.securecode.assessment.dto;

import java.time.Instant;
import java.util.UUID;

public record AssessmentLinkResponse(
        UUID id,
        UUID applicantId,
        UUID templateId,
        String token,
        String status,
        Instant expiresAt,
        String testUrl
) {}
