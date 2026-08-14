package ai.securecode.assessment.dto;

import java.util.List;
import java.util.UUID;

public record BulkInviteResponse(
        int totalInvited,
        List<String> tokens,
        List<String> errors
) {}
