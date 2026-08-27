package ai.securecode.identity.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank @Email String email,
        @NotBlank String password,
        String deviceFingerprint,
        String userAgent,
        String platform,
        String screenResolution,
        String timezone,
        String language
) {}
