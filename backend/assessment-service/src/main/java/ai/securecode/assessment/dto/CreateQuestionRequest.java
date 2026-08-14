package ai.securecode.assessment.dto;

import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
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
        String testCases,
        String hiddenTestCases,
        BigDecimal negativeMarks,
        Boolean randomizePool
) {}
