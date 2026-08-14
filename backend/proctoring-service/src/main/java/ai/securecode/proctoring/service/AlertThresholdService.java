package ai.securecode.proctoring.service;

import ai.securecode.proctoring.entity.RiskScoreSnapshot;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.UUID;

@Service
public class AlertThresholdService {

    @Value("${proctoring.alert.threshold.warning:30}")
    private double warningThreshold = 30;

    @Value("${proctoring.alert.threshold.critical:60}")
    private double criticalThreshold = 60;

    @Value("${proctoring.alert.threshold.termination:80}")
    private double terminationThreshold = 80;

    @Value("${proctoring.alert.max-face-lost-warnings:3}")
    private int maxFaceLostWarnings = 3;

    @Value("${proctoring.alert.max-tab-switch-warnings:2}")
    private int maxTabSwitchWarnings = 2;

    @Value("${proctoring.alert.max-copy-paste-warnings:1}")
    private int maxCopyPasteWarnings = 1;

    public enum AlertLevel {
        NONE, WARNING, CRITICAL, TERMINATE
    }

    public record AlertEvaluation(
            AlertLevel level,
            double currentScore,
            String message,
            boolean shouldTerminate
    ) {}

    public AlertLevel evaluateScore(double score) {
        if (score >= terminationThreshold) return AlertLevel.TERMINATE;
        if (score >= criticalThreshold) return AlertLevel.CRITICAL;
        if (score >= warningThreshold) return AlertLevel.WARNING;
        return AlertLevel.NONE;
    }

    public AlertEvaluation evaluate(RiskScoreSnapshot snapshot) {
        double score = snapshot.getScore().doubleValue();
        AlertLevel level = evaluateScore(score);

        String message = switch (level) {
            case TERMINATE -> "Risk score " + score + " exceeds termination threshold " + terminationThreshold;
            case CRITICAL -> "Risk score " + score + " exceeds critical threshold " + criticalThreshold;
            case WARNING -> "Risk score " + score + " exceeds warning threshold " + warningThreshold;
            case NONE -> "Risk score within acceptable range";
        };

        return new AlertEvaluation(level, score, message, level == AlertLevel.TERMINATE);
    }

    public boolean shouldTerminateForViolations(String eventType, int warningCount) {
        return switch (eventType) {
            case "face_lost", "multi_face" -> warningCount >= maxFaceLostWarnings;
            case "tab_switch" -> warningCount >= maxTabSwitchWarnings;
            case "copy_paste" -> warningCount >= maxCopyPasteWarnings;
            default -> false;
        };
    }

    public double getWarningThreshold() { return warningThreshold; }
    public double getCriticalThreshold() { return criticalThreshold; }
    public double getTerminationThreshold() { return terminationThreshold; }
}
