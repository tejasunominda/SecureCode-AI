package ai.securecode.assessment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record CreateQuestionRequest(
        @NotBlank String type,
        @NotBlank String body,
        String optionA,
        String optionB,
        String optionC,
        String optionD,
        String correctOption,
        String difficulty,
        String tags,
        String testCases
) {}
