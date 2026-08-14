package ai.securecode.identity.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public record ForgotPasswordRequest(
        @NotBlank @Email String email,
        UUID orgId
) {}
