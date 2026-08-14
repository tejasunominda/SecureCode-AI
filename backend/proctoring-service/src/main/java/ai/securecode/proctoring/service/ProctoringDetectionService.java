package ai.securecode.proctoring.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Enhanced proctoring detection hooks (FR-PROC-04..06).
 * Provides server-side validation and scoring for:
 * - Voice activity detection (silence / suspicious audio)
 * - Gaze tracking (looking away from screen)
 * - Object detection (phone, extra person in frame)
 *
 * Client-side detection runs in the browser; this service receives
 * detection events via WebSocket/Kafka and applies scoring rules.
 */
@Service
public class ProctoringDetectionService {

    private static final Logger log = LoggerFactory.getLogger(ProctoringDetectionService.class);

    @Value("${proctoring.voice-activity.enabled:true}")
    private boolean voiceActivityEnabled;

    @Value("${proctoring.voice-activity.silence-threshold-db:-40}")
    private double silenceThresholdDb;

    @Value("${proctoring.voice-activity.max-silence-seconds:30}")
    private int maxSilenceSeconds;

    @Value("${proctoring.gaze-detection.enabled:true}")
    private boolean gazeDetectionEnabled;

    @Value("${proctoring.gaze-detection.gaze-away-threshold-seconds:5}")
    private int gazeAwayThresholdSeconds;

    @Value("${proctoring.object-detection.enabled:true}")
    private boolean objectDetectionEnabled;

    @Value("${proctoring.object-detection.detect-phone:true}")
    private boolean detectPhone;

    @Value("${proctoring.object-detection.detect-extra-person:true}")
    private boolean detectExtraPerson;

    /**
     * Process voice activity detection event from client.
     * Returns a risk score contribution (0.0 to 1.0).
     */
    public double processVoiceActivity(UUID sessionId, double audioLevelDb, int silenceDurationSeconds) {
        if (!voiceActivityEnabled) return 0.0;

        double score = 0.0;

        if (audioLevelDb > silenceThresholdDb + 20) {
            log.warn("Session {}: Suspicious audio level: {} dB", sessionId, audioLevelDb);
            score += 0.3;
        }

        if (silenceDurationSeconds > maxSilenceSeconds) {
            log.warn("Session {}: Extended silence: {}s", sessionId, silenceDurationSeconds);
            score += 0.1;
        }

        return Math.min(score, 1.0);
    }

    /**
     * Process gaze tracking event from client.
     * Returns a risk score contribution (0.0 to 1.0).
     */
    public double processGaze(UUID sessionId, double gazeConfidence, int gazeAwaySeconds) {
        if (!gazeDetectionEnabled) return 0.0;

        double score = 0.0;

        if (gazeAwaySeconds > gazeAwayThresholdSeconds) {
            log.warn("Session {}: Gaze away for {}s (threshold: {}s)",
                    sessionId, gazeAwaySeconds, gazeAwayThresholdSeconds);
            score += Math.min(0.05 * (gazeAwaySeconds - gazeAwayThresholdSeconds), 0.5);
        }

        if (gazeConfidence < 0.3) {
            log.warn("Session {}: Low gaze confidence: {}", sessionId, gazeConfidence);
            score += 0.2;
        }

        return Math.min(score, 1.0);
    }

    /**
     * Process object detection event from client.
     * Returns a risk score contribution (0.0 to 1.0).
     */
    public double processObjectDetection(UUID sessionId, String detectedObject, double confidence) {
        if (!objectDetectionEnabled) return 0.0;

        double score = 0.0;

        if (detectPhone && "phone".equalsIgnoreCase(detectedObject) && confidence > 0.5) {
            log.warn("Session {}: Phone detected (confidence: {})", sessionId, confidence);
            score += 0.6;
        }

        if (detectExtraPerson && "person".equalsIgnoreCase(detectedObject) && confidence > 0.7) {
            log.warn("Session {}: Extra person detected (confidence: {})", sessionId, confidence);
            score += 0.8;
        }

        return Math.min(score, 1.0);
    }

    /**
     * Compute composite risk score from all detection signals.
     */
    public double computeCompositeScore(double voiceScore, double gazeScore,
                                         double objectScore, double codeSimilarityScore) {
        double weighted = (voiceScore * 0.15) +
                (gazeScore * 0.25) +
                (objectScore * 0.35) +
                (codeSimilarityScore * 0.25);
        return Math.min(weighted, 1.0);
    }
}
