package ai.securecode.proctoring.service;

import ai.securecode.proctoring.entity.ProctoringEvent;
import ai.securecode.proctoring.entity.ViolationReview;
import ai.securecode.proctoring.repository.ProctoringEventRepository;
import ai.securecode.proctoring.repository.ViolationReviewRepository;
import ai.securecode.proctoring.repository.RiskScoreSnapshotRepository;
import ai.securecode.common.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Human review workflow (FR-PROC-10, A.19.6).
 * Provides an evidence timeline for reviewers to examine proctoring
 * violations, review recordings, and make decisions.
 */
@Service
@Transactional
public class HumanReviewService {

    private final ViolationReviewRepository reviewRepo;
    private final ProctoringEventRepository eventRepo;
    private final RiskScoreSnapshotRepository riskRepo;

    public HumanReviewService(ViolationReviewRepository reviewRepo,
                              ProctoringEventRepository eventRepo,
                              RiskScoreSnapshotRepository riskRepo) {
        this.reviewRepo = reviewRepo;
        this.eventRepo = eventRepo;
        this.riskRepo = riskRepo;
    }

    public record EvidenceTimelineItem(
            Instant timestamp,
            String eventType,
            String severity,
            Double confidenceScore,
            String evidenceUrl,
            String detectionMetadata
    ) {}

    public record SessionReviewSummary(
            UUID sessionId,
            double currentRiskScore,
            int totalViolations,
            int reviewedViolations,
            int pendingViolations,
            List<EvidenceTimelineItem> timeline
    ) {}

    public SessionReviewSummary getSessionReviewSummary(UUID sessionId) {
        List<ProctoringEvent> events = eventRepo.findBySessionIdOrderByOccurredAtAsc(sessionId);
        List<ViolationReview> reviews = reviewRepo.findBySessionId(sessionId);

        List<EvidenceTimelineItem> timeline = events.stream()
                .map(e -> new EvidenceTimelineItem(
                        e.getOccurredAt(),
                        e.getEventType(),
                        String.valueOf(e.getSeverity()),
                        e.getConfidenceScore() != null ? e.getConfidenceScore().doubleValue() : null,
                        e.getEvidenceUri(),
                        e.getDetectionMetadata()
                ))
                .sorted((a, b) -> a.timestamp().compareTo(b.timestamp()))
                .toList();

        int reviewed = (int) reviews.stream().filter(r -> !"PENDING".equalsIgnoreCase(r.getDecision())).count();
        int pending = events.size() - reviewed;

        double riskScore = riskRepo.findBySessionId(sessionId)
                .map(s -> s.getScore().doubleValue())
                .orElse(0.0);

        return new SessionReviewSummary(
                sessionId,
                riskScore,
                events.size(),
                reviewed,
                Math.max(pending, 0),
                timeline
            );
    }

    public ViolationReview submitReview(UUID proctoringEventId, UUID sessionId, UUID reviewerUserId,
                                         String decision, String notes) {
        ProctoringEvent event = eventRepo.findFirstById(proctoringEventId)
                .orElseThrow(() -> new ApiException("NOT_FOUND", HttpStatus.NOT_FOUND, "Proctoring event not found"));

        ViolationReview review = new ViolationReview();
        review.setProctoringEventId(proctoringEventId);
        review.setSessionId(sessionId);
        review.setReviewerUserId(reviewerUserId);
        review.setDecision(decision);
        review.setNotes(notes);
        review.setReviewedAt(Instant.now());

        return reviewRepo.save(review);
    }

    public List<ViolationReview> getReviewsForSession(UUID sessionId) {
        return reviewRepo.findBySessionId(sessionId);
    }

    public List<ProctoringEvent> getPendingReviews(UUID sessionId) {
        List<ProctoringEvent> events = eventRepo.findBySessionIdOrderByOccurredAtAsc(sessionId);
        List<UUID> reviewedEventIds = reviewRepo.findBySessionId(sessionId).stream()
                .map(ViolationReview::getProctoringEventId)
                .toList();

        return events.stream()
                .filter(e -> !reviewedEventIds.contains(e.getId()))
                .toList();
    }
}
