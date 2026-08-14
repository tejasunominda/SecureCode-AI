package ai.securecode.identity.dto;

import jakarta.validation.constraints.NotBlank;

public record MfaVerifyRequest(
        @NotBlank String mfaToken,
        @NotBlank int code
) {}
