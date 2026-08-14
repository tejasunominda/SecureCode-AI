package ai.securecode.identity.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record InviteUserRequest(
        @Email @NotEmpty String email,
        @NotEmpty List<String> roles,
        String tempPassword
) {}
