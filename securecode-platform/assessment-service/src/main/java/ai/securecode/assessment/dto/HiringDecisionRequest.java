package ai.securecode.assessment.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public record HiringDecisionRequest(
        @NotBlank String decision,
        String technicalManagerNotes
) {}
