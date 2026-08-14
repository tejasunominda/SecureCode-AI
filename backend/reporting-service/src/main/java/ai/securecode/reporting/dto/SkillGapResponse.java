package ai.securecode.reporting.dto;

import java.math.BigDecimal;

public record SkillGapResponse(
        String skillTag,
        int totalAttempts,
        int passCount,
        BigDecimal avgScore
) {}
