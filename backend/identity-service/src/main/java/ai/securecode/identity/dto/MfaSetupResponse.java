package ai.securecode.identity.dto;

public record MfaSetupResponse(
        String secret,
        String otpAuthUri
) {}
