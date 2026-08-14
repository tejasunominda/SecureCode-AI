package ai.securecode.proctoring.service;

import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

/**
 * Code similarity detection (FR-PROC-09).
 * Compares candidate submissions against a corpus of known solutions
 * and other candidates' submissions to detect plagiarism.
 *
 * Uses a token-based similarity approach (simplified MOSS-like algorithm).
 * In production, this would integrate with an external service like MOSS
 * or use a more sophisticated AST-based comparison.
 */
@Service
public class CodeSimilarityService {

    /**
     * Compute similarity score between two code snippets.
     * Returns a value between 0.0 (completely different) and 1.0 (identical).
     */
    public double computeSimilarity(String code1, String code2) {
        if (code1 == null || code2 == null || code1.isBlank() || code2.isBlank()) {
            return 0.0;
        }

        String normalized1 = normalize(code1);
        String normalized2 = normalize(code2);

        if (normalized1.equals(normalized2)) {
            return 1.0;
        }

        return jaccardSimilarity(normalized1, normalized2);
    }

    /**
     * Check a candidate's code against a corpus of reference solutions.
     * Returns the maximum similarity score found.
     */
    public double checkAgainstCorpus(String candidateCode, Map<String, String> referenceCorpus) {
        double maxSimilarity = 0.0;
        for (Map.Entry<String, String> entry : referenceCorpus.entrySet()) {
            double similarity = computeSimilarity(candidateCode, entry.getValue());
            if (similarity > maxSimilarity) {
                maxSimilarity = similarity;
            }
        }
        return maxSimilarity;
    }

    /**
     * Check a candidate's code against other candidates' submissions
     * in the same assessment session batch.
     */
    public Map<String, Double> checkAgainstPeers(String candidateCode, Map<String, String> peerSubmissions) {
        Map<String, Double> results = new HashMap<>();
        for (Map.Entry<String, String> entry : peerSubmissions.entrySet()) {
            results.put(entry.getKey(), computeSimilarity(candidateCode, entry.getValue()));
        }
        return results;
    }

    /**
     * Determine if a similarity score constitutes a violation.
     */
    public boolean isPlagiarismDetected(double similarityScore) {
        return similarityScore >= 0.85;
    }

    private String normalize(String code) {
        return code
                .replaceAll("//.*", "")
                .replaceAll("/\\*[\\s\\S]*?\\*/", "")
                .replaceAll("#.*", "")
                .replaceAll("\\s+", " ")
                .replaceAll("\"[^\"]*\"", "\"\"")
                .trim()
                .toLowerCase();
    }

    private double jaccardSimilarity(String s1, String s2) {
        String[] tokens1 = s1.split("[\\s;(){}\\[\\].,=+\\-*/<>!&|]+");
        String[] tokens2 = s2.split("[\\s;(){}\\[\\].,=+\\-*/<>!&|]+");

        java.util.Set<String> set1 = new java.util.HashSet<>(java.util.Arrays.asList(tokens1));
        java.util.Set<String> set2 = new java.util.HashSet<>(java.util.Arrays.asList(tokens2));

        java.util.Set<String> intersection = new java.util.HashSet<>(set1);
        intersection.retainAll(set2);

        java.util.Set<String> union = new java.util.HashSet<>(set1);
        union.addAll(set2);

        if (union.isEmpty()) return 0.0;
        return (double) intersection.size() / union.size();
    }
}
