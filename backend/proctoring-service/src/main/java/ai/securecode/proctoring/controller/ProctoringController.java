package ai.securecode.proctoring.controller;

import ai.securecode.proctoring.entity.ProctoringEvent;
import ai.securecode.proctoring.entity.RiskScoreSnapshot;
import ai.securecode.proctoring.entity.ViolationReview;
import ai.securecode.proctoring.repository.ProctoringEventRepository;
import ai.securecode.proctoring.repository.ViolationReviewRepository;
import ai.securecode.proctoring.service.AlertThresholdService;
import ai.securecode.proctoring.service.HumanReviewService;
import ai.securecode.proctoring.service.RiskScoringEngine;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/proctoring")
public class ProctoringController {

    private final ProctoringEventRepository eventRepo;
    private final RiskScoringEngine riskEngine;
    private final ViolationReviewRepository reviewRepo;
    private final AlertThresholdService alertThresholdService;
    private final HumanReviewService humanReviewService;

    public ProctoringController(ProctoringEventRepository eventRepo,
                                RiskScoringEngine riskEngine,
                                ViolationReviewRepository reviewRepo,
                                AlertThresholdService alertThresholdService,
                                HumanReviewService humanReviewService) {
        this.eventRepo = eventRepo;
        this.riskEngine = riskEngine;
        this.reviewRepo = reviewRepo;
        this.alertThresholdService = alertThresholdService;
        this.humanReviewService = humanReviewService;
    }

    @GetMapping("/sessions/{sessionId}/events")
    public ResponseEntity<List<ProctoringEvent>> getEvents(@PathVariable UUID sessionId) {
        return ResponseEntity.ok(eventRepo.findBySessionIdOrderByOccurredAtAsc(sessionId));
    }

    @GetMapping("/sessions/{sessionId}/risk-score")
    public ResponseEntity<RiskScoreSnapshot> getRiskScore(@PathVariable UUID sessionId) {
        return ResponseEntity.ok(riskEngine.getScore(sessionId));
    }

    @PostMapping("/sessions/{sessionId}/risk-score/recompute")
    public ResponseEntity<RiskScoreSnapshot> recomputeRiskScore(@PathVariable UUID sessionId) {
        return ResponseEntity.ok(riskEngine.recomputeScore(sessionId));
    }

    @PostMapping("/events/{eventId}/review")
    public ResponseEntity<ViolationReview> reviewViolation(
            @PathVariable UUID eventId,
            @RequestHeader("X-User-Id") UUID reviewerUserId,
            @RequestBody Map<String, String> body) {
        ViolationReview review = new ViolationReview();
        review.setProctoringEventId(eventId);
        review.setSessionId(UUID.fromString(body.get("sessionId")));
        review.setReviewerUserId(reviewerUserId);
        review.setDecision(body.get("decision"));
        review.setNotes(body.get("notes"));
        review.setReviewedAt(Instant.now());
        return ResponseEntity.ok(reviewRepo.save(review));
    }

    @GetMapping("/sessions/{sessionId}/reviews")
    public ResponseEntity<List<ViolationReview>> getReviews(@PathVariable UUID sessionId) {
        return ResponseEntity.ok(reviewRepo.findBySessionId(sessionId));
    }

    @GetMapping("/sessions/{sessionId}/alert")
    public ResponseEntity<AlertThresholdService.AlertEvaluation> getAlertEvaluation(@PathVariable UUID sessionId) {
        RiskScoreSnapshot snapshot = riskEngine.recomputeScore(sessionId);
        return ResponseEntity.ok(alertThresholdService.evaluate(snapshot));
    }

    @GetMapping("/alert-thresholds")
    public ResponseEntity<Map<String, Object>> getAlertThresholds() {
        return ResponseEntity.ok(Map.of(
                "warning", alertThresholdService.getWarningThreshold(),
                "critical", alertThresholdService.getCriticalThreshold(),
                "termination", alertThresholdService.getTerminationThreshold()
        ));
    }

    @GetMapping("/sessions/{sessionId}/review-summary")
    public ResponseEntity<HumanReviewService.SessionReviewSummary> getReviewSummary(@PathVariable UUID sessionId) {
        return ResponseEntity.ok(humanReviewService.getSessionReviewSummary(sessionId));
    }

    @GetMapping("/sessions/{sessionId}/pending-reviews")
    public ResponseEntity<List<ProctoringEvent>> getPendingReviews(@PathVariable UUID sessionId) {
        return ResponseEntity.ok(humanReviewService.getPendingReviews(sessionId));
    }
}
