package ai.securecode.identity.dto;

import java.util.List;
import java.util.UUID;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        long expiresIn,
        UUID userId,
        UUID orgId,
        String email,
        List<String> roles
) {}
