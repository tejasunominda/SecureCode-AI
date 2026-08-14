package ai.securecode.proctoring.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class ProctoringDetectionServiceTest {

    private ProctoringDetectionService service;
    private UUID sessionId;

    @BeforeEach
    void setUp() {
        service = new ProctoringDetectionService();
        sessionId = UUID.randomUUID();
        ReflectionTestUtils.setField(service, "voiceActivityEnabled", true);
        ReflectionTestUtils.setField(service, "silenceThresholdDb", -40.0);
        ReflectionTestUtils.setField(service, "maxSilenceSeconds", 30);
        ReflectionTestUtils.setField(service, "gazeDetectionEnabled", true);
        ReflectionTestUtils.setField(service, "gazeAwayThresholdSeconds", 5);
        ReflectionTestUtils.setField(service, "objectDetectionEnabled", true);
        ReflectionTestUtils.setField(service, "detectPhone", true);
        ReflectionTestUtils.setField(service, "detectExtraPerson", true);
    }

    @Test
    void processVoiceActivity_normalLevel_returnsLowScore() {
        double score = service.processVoiceActivity(sessionId, -30.0, 10);
        assertTrue(score < 0.3, "Normal audio should have low risk score");
    }

    @Test
    void processVoiceActivity_suspiciousLevel_returnsHigherScore() {
        double score = service.processVoiceActivity(sessionId, 0.0, 10);
        assertTrue(score >= 0.3, "Suspicious audio level should increase risk score");
    }

    @Test
    void processVoiceActivity_extendedSilence_addsScore() {
        double score = service.processVoiceActivity(sessionId, -50.0, 60);
        assertTrue(score > 0, "Extended silence should add to risk score");
    }

    @Test
    void processGaze_normalGaze_returnsLowScore() {
        double score = service.processGaze(sessionId, 0.9, 2);
        assertEquals(0.0, score, 0.001, "Normal gaze should have zero risk");
    }

    @Test
    void processGaze_awayTooLong_addsScore() {
        double score = service.processGaze(sessionId, 0.8, 15);
        assertTrue(score > 0, "Gaze away beyond threshold should add risk score");
    }

    @Test
    void processGaze_lowConfidence_addsScore() {
        double score = service.processGaze(sessionId, 0.2, 1);
        assertTrue(score >= 0.2, "Low gaze confidence should add risk score");
    }

    @Test
    void processObjectDetection_phoneDetected_addsHighScore() {
        double score = service.processObjectDetection(sessionId, "phone", 0.8);
        assertTrue(score >= 0.6, "Phone detection should add high risk score");
    }

    @Test
    void processObjectDetection_personDetected_addsHighScore() {
        double score = service.processObjectDetection(sessionId, "person", 0.9);
        assertTrue(score >= 0.8, "Extra person detection should add very high risk score");
    }

    @Test
    void processObjectDetection_unknownObject_returnsZero() {
        double score = service.processObjectDetection(sessionId, "laptop", 0.9);
        assertEquals(0.0, score, 0.001, "Unknown objects should not add risk");
    }

    @Test
    void computeCompositeScore_weightsCorrectly() {
        double score = service.computeCompositeScore(0.5, 0.4, 0.6, 0.3);
        double expected = (0.5 * 0.15) + (0.4 * 0.25) + (0.6 * 0.35) + (0.3 * 0.25);
        assertEquals(expected, score, 0.001);
    }

    @Test
    void computeCompositeScore_cappedAtOne() {
        double score = service.computeCompositeScore(1.0, 1.0, 1.0, 1.0);
        assertEquals(1.0, score, 0.001, "Composite score should be capped at 1.0");
    }
}
