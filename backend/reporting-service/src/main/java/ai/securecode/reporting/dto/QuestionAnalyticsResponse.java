package ai.securecode.reporting.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record QuestionAnalyticsResponse(
        UUID questionId,
        String questionType,
        String difficulty,
        int timesAttempted,
        int correctCount,
        long avgTimeMs,
        BigDecimal discriminationIndex
) {}
