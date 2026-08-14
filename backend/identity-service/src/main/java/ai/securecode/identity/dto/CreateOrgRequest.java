package ai.securecode.identity.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.UUID;

public record CreateOrgRequest(
        @NotBlank String name,
        String tier,
        String dataResidency,
        UUID parentOrgId
) {}
