package ai.securecode.assessment.dto;

import java.time.Instant;
import java.util.UUID;

public record ApplicantResponse(
        UUID id,
        String name,
        String email,
        String resumeUrl,
        String status,
        Instant createdAt
) {}
