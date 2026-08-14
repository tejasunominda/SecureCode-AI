package ai.securecode.reporting.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record OrgAnalyticsResponse(
        UUID orgId,
        int totalSessions,
        int completedSessions,
        int terminatedSessions,
        BigDecimal avgScore,
        BigDecimal passRate,
        int totalViolations,
        int confirmedViolations,
        int hiringShortlisted,
        int hiringRejected
) {}
