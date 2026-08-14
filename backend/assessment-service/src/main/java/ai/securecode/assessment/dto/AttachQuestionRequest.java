package ai.securecode.assessment.dto;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

public record AttachQuestionRequest(
        @NotNull UUID questionId,
        BigDecimal weight,
        Integer displayOrder
) {}
