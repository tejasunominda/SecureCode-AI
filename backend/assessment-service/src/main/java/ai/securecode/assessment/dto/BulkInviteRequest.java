package ai.securecode.assessment.dto;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record BulkInviteRequest(
        @NotEmpty List<CandidateInvite> candidates
) {
    public record CandidateInvite(
            String name,
            String email
    ) {}
}
