package ai.securecode.identity.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record LoginRequest(
        @NotNull UUID orgId,
        @NotBlank @Email String email,
        @NotBlank String password
) {}
