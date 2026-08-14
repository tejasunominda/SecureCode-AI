package ai.securecode.reporting.service;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.math.RoundingMode;

import static org.junit.jupiter.api.Assertions.*;

class CheatingInsightsReportServiceTest {

    private final CheatingInsightsReportService service = new CheatingInsightsReportService();

    @Test
    void computeDiscriminationIndex_goodQuestion_returnsHighDI() {
        BigDecimal di = service.computeDiscriminationIndex(8, 10, 2, 10);
        BigDecimal expected = BigDecimal.valueOf(0.8).setScale(2, RoundingMode.HALF_UP);
        assertEquals(expected, di);
    }

    @Test
    void computeDiscriminationIndex_poorQuestion_returnsLowDI() {
        BigDecimal di = service.computeDiscriminationIndex(5, 10, 5, 10);
        assertEquals(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP), di);
    }

    @Test
    void computeDiscriminationIndex_negativeDI_returnsNegative() {
        BigDecimal di = service.computeDiscriminationIndex(2, 10, 8, 10);
        assertTrue(di.doubleValue() < 0, "Bottom group scoring higher than top should yield negative DI");
    }

    @Test
    void computeDiscriminationIndex_zeroTotal_returnsZero() {
        assertEquals(BigDecimal.ZERO, service.computeDiscriminationIndex(5, 0, 3, 10));
        assertEquals(BigDecimal.ZERO, service.computeDiscriminationIndex(5, 10, 3, 0));
    }

    @Test
    void rateDiscriminationIndex_excellent() {
        assertEquals("excellent", service.rateDiscriminationIndex(BigDecimal.valueOf(0.45)));
    }

    @Test
    void rateDiscriminationIndex_good() {
        assertEquals("good", service.rateDiscriminationIndex(BigDecimal.valueOf(0.35)));
    }

    @Test
    void rateDiscriminationIndex_marginal() {
        assertEquals("marginal", service.rateDiscriminationIndex(BigDecimal.valueOf(0.20)));
    }

    @Test
    void rateDiscriminationIndex_poor() {
        assertEquals("poor", service.rateDiscriminationIndex(BigDecimal.valueOf(0.05)));
    }

    @Test
    void rateDiscriminationIndex_negative() {
        assertEquals("negative", service.rateDiscriminationIndex(BigDecimal.valueOf(-0.10)));
    }

    @Test
    void buildFunnel_returnsCorrectCounts() {
        var funnel = service.buildFunnel(100, 30, 10, 15, 8, 5);
        assertEquals(100, funnel.totalCandidates());
        assertEquals(30, funnel.flaggedByProctoring());
        assertEquals(10, funnel.flaggedByCodeSimilarity());
        assertEquals(15, funnel.sentForHumanReview());
        assertEquals(8, funnel.confirmedViolations());
        assertEquals(5, funnel.autoTerminated());
    }

    @Test
    void computeViolationRate_normalCase() {
        BigDecimal rate = service.computeViolationRate(25, 100);
        assertEquals(BigDecimal.valueOf(25.00).setScale(2, RoundingMode.HALF_UP), rate);
    }

    @Test
    void computeViolationRate_zeroSessions_returnsZero() {
        assertEquals(BigDecimal.ZERO, service.computeViolationRate(5, 0));
    }
}
