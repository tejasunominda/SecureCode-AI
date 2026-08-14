package ai.securecode.reporting.service;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Cheating insights report generator (FR-RPT-08..10).
 * Provides funnel analysis, discrimination index computation, and
 * cheating detection summary for organizational reporting.
 */
@Service
public class CheatingInsightsReportService {

    public record CheatingFunnel(
            int totalCandidates,
            int flaggedByProctoring,
            int flaggedByCodeSimilarity,
            int sentForHumanReview,
            int confirmedViolations,
            int autoTerminated
    ) {}

    public record QuestionDiscrimination(
            UUID questionId,
            int topGroupCorrect,
            int bottomGroupCorrect,
            int totalAttempts,
            BigDecimal discriminationIndex,
            String qualityRating
    ) {}

    public record CheatingInsightsReport(
            UUID orgId,
            CheatingFunnel funnel,
            List<QuestionDiscrimination> discrimination,
            Map<String, BigDecimal> violationTypeBreakdown,
            BigDecimal avgRiskScore,
            int totalSessions,
            int sessionsWithViolations,
            BigDecimal violationRate
    ) {}

    /**
     * Compute discrimination index for a question.
     * DI = (Top 27% correct rate) - (Bottom 27% correct rate)
     * Values > 0.3 = good, 0.1-0.3 = marginal, < 0.1 = poor
     */
    public BigDecimal computeDiscriminationIndex(int topCorrect, int topTotal, int bottomCorrect, int bottomTotal) {
        if (topTotal == 0 || bottomTotal == 0) return BigDecimal.ZERO;
        BigDecimal topRate = BigDecimal.valueOf(topCorrect).divide(BigDecimal.valueOf(topTotal), 4, RoundingMode.HALF_UP);
        BigDecimal bottomRate = BigDecimal.valueOf(bottomCorrect).divide(BigDecimal.valueOf(bottomTotal), 4, RoundingMode.HALF_UP);
        return topRate.subtract(bottomRate).setScale(2, RoundingMode.HALF_UP);
    }

    public String rateDiscriminationIndex(BigDecimal di) {
        double val = di.doubleValue();
        if (val >= 0.4) return "excellent";
        if (val >= 0.3) return "good";
        if (val >= 0.1) return "marginal";
        if (val >= 0.0) return "poor";
        return "negative";
    }

    /**
     * Build a funnel from raw counts.
     */
    public CheatingFunnel buildFunnel(int totalCandidates, int flaggedByProctoring,
                                       int flaggedByCodeSimilarity, int sentForHumanReview,
                                       int confirmedViolations, int autoTerminated) {
        return new CheatingFunnel(
                totalCandidates,
                flaggedByProctoring,
                flaggedByCodeSimilarity,
                sentForHumanReview,
                confirmedViolations,
                autoTerminated
        );
    }

    /**
     * Compute violation rate as a percentage.
     */
    public BigDecimal computeViolationRate(int sessionsWithViolations, int totalSessions) {
        if (totalSessions == 0) return BigDecimal.ZERO;
        return BigDecimal.valueOf(sessionsWithViolations)
                .multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(totalSessions), 2, RoundingMode.HALF_UP);
    }
}
