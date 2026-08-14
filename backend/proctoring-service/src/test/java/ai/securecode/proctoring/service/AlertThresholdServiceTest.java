package ai.securecode.proctoring.service;

import ai.securecode.proctoring.entity.RiskScoreSnapshot;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class AlertThresholdServiceTest {

    private final AlertThresholdService service = new AlertThresholdService();

    private RiskScoreSnapshot snapshot(double score) {
        RiskScoreSnapshot s = new RiskScoreSnapshot();
        s.setScore(BigDecimal.valueOf(score));
        return s;
    }

    @Test
    void evaluateScore_belowWarning_returnsNone() {
        assertEquals(AlertThresholdService.AlertLevel.NONE, service.evaluateScore(10));
    }

    @Test
    void evaluateScore_atWarning_returnsWarning() {
        assertEquals(AlertThresholdService.AlertLevel.WARNING, service.evaluateScore(30));
    }

    @Test
    void evaluateScore_atCritical_returnsCritical() {
        assertEquals(AlertThresholdService.AlertLevel.CRITICAL, service.evaluateScore(60));
    }

    @Test
    void evaluateScore_atTermination_returnsTerminate() {
        assertEquals(AlertThresholdService.AlertLevel.TERMINATE, service.evaluateScore(80));
    }

    @Test
    void evaluateScore_aboveMax_returnsTerminate() {
        assertEquals(AlertThresholdService.AlertLevel.TERMINATE, service.evaluateScore(100));
    }

    @Test
    void evaluate_lowScore_noAlert() {
        AlertThresholdService.AlertEvaluation eval = service.evaluate(snapshot(15));
        assertEquals(AlertThresholdService.AlertLevel.NONE, eval.level());
        assertFalse(eval.shouldTerminate());
    }

    @Test
    void evaluate_criticalScore_shouldNotTerminate() {
        AlertThresholdService.AlertEvaluation eval = service.evaluate(snapshot(65));
        assertEquals(AlertThresholdService.AlertLevel.CRITICAL, eval.level());
        assertFalse(eval.shouldTerminate());
    }

    @Test
    void evaluate_terminationScore_shouldTerminate() {
        AlertThresholdService.AlertEvaluation eval = service.evaluate(snapshot(90));
        assertEquals(AlertThresholdService.AlertLevel.TERMINATE, eval.level());
        assertTrue(eval.shouldTerminate());
    }

    @Test
    void shouldTerminateForViolations_faceLostUnderLimit_returnsFalse() {
        assertFalse(service.shouldTerminateForViolations("face_lost", 2));
    }

    @Test
    void shouldTerminateForViolations_faceLostAtLimit_returnsTrue() {
        assertTrue(service.shouldTerminateForViolations("face_lost", 3));
    }

    @Test
    void shouldTerminateForViolations_copyPasteAtLimit_returnsTrue() {
        assertTrue(service.shouldTerminateForViolations("copy_paste", 1));
    }

    @Test
    void shouldTerminateForViolations_unknownEvent_returnsFalse() {
        assertFalse(service.shouldTerminateForViolations("unknown_event", 100));
    }
}
