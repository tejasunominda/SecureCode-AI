package ai.securecode.identity.dto;

import java.util.List;

public record UpdateUserRequest(
        List<String> roles,
        String status
) {}
