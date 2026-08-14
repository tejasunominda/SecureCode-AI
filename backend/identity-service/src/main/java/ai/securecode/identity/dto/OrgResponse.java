package ai.securecode.identity.dto;

import java.time.Instant;
import java.util.UUID;

public record OrgResponse(
        UUID id,
        UUID parentOrgId,
        String name,
        String tier,
        String dataResidency,
        String status,
        Instant createdAt
) {}
