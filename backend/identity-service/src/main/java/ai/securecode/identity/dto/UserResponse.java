package ai.securecode.identity.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record UserResponse(
        UUID id,
        String email,
        boolean mfaEnabled,
        String status,
        List<String> roles,
        Instant createdAt
) {}
