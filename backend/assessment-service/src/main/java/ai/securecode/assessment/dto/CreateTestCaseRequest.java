package ai.securecode.assessment.dto;

import java.math.BigDecimal;

public record CreateTestCaseRequest(
        String input,
        String expectedOutput,
        boolean isHidden,
        BigDecimal weight
) {}
