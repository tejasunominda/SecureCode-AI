package ai.securecode.assessment.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record SessionReportResponse(
        UUID sessionId,
        UUID applicantId,
        String applicantName,
        String applicantEmail,
        String status,
        Instant startedAt,
        Instant submittedAt,
        int aptitudeCorrect,
        int aptitudeTotal,
        int reasoningCorrect,
        int reasoningTotal,
        List<CodingResultDetail> codingResults,
        List<ProctoringEventDetail> proctoringEvents,
        String hiringDecision,
        String technicalManagerNotes
) {
    public record CodingResultDetail(
            UUID questionId,
            String language,
            String code,
            int visibleTestsPassed,
            int hiddenTestsPassed,
            int hiddenTestsTotal,
            long runtimeMs
    ) {}

    public record ProctoringEventDetail(
            String eventType,
            int warningNumber,
            Instant occurredAt
    ) {}
}
