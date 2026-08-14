package ai.securecode.proctoring.service;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class CodeSimilarityServiceTest {

    private final CodeSimilarityService service = new CodeSimilarityService();

    @Test
    void computeSimilarity_identicalCode_returnsOne() {
        String code = "public class Solution { public int add(int a, int b) { return a + b; } }";
        double similarity = service.computeSimilarity(code, code);
        assertEquals(1.0, similarity, 0.001);
    }

    @Test
    void computeSimilarity_completelyDifferent_returnsLowScore() {
        String code1 = "public class Solution { public int add(int a, int b) { return a + b; } }";
        String code2 = "function multiply(x, y) { return x * y; }";
        double similarity = service.computeSimilarity(code1, code2);
        assertTrue(similarity < 0.5, "Different code should have low similarity");
    }

    @Test
    void computeSimilarity_nullInput_returnsZero() {
        assertEquals(0.0, service.computeSimilarity(null, "code"));
        assertEquals(0.0, service.computeSimilarity("code", null));
        assertEquals(0.0, service.computeSimilarity("", "code"));
    }

    @Test
    void computeSimilarity_commentsIgnored() {
        String code1 = "int x = 5; // set x";
        String code2 = "int x = 5; // different comment";
        double similarity = service.computeSimilarity(code1, code2);
        assertEquals(1.0, similarity, 0.001, "Comments should be normalized away");
    }

    @Test
    void checkAgainstCorpus_returnsMaxSimilarity() {
        String candidate = "public class Solution { public int add(int a, int b) { return a + b; } }";
        Map<String, String> corpus = Map.of(
                "ref1", "public class Solution { public int add(int a, int b) { return a + b; } }",
                "ref2", "function multiply(x, y) { return x * y; }"
        );
        double maxSim = service.checkAgainstCorpus(candidate, corpus);
        assertEquals(1.0, maxSim, 0.001);
    }

    @Test
    void isPlagiarismDetected_thresholdAt85Percent() {
        assertFalse(service.isPlagiarismDetected(0.84));
        assertTrue(service.isPlagiarismDetected(0.85));
        assertTrue(service.isPlagiarismDetected(1.0));
    }
}
