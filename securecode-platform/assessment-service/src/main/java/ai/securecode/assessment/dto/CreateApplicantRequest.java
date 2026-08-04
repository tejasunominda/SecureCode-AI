package ai.securecode.assessment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Email;
import java.util.UUID;

public record CreateApplicantRequest(
        @NotBlank String name,
        @NotBlank @Email String email,
        String resumeUrl
) {}
