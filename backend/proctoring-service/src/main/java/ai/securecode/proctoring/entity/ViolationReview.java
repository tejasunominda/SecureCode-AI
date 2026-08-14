package ai.securecode.proctoring.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "violation_review")
public class ViolationReview {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "proctoring_event_id", nullable = false)
    private UUID proctoringEventId;

    @Column(name = "session_id", nullable = false)
    private UUID sessionId;

    @Column(name = "reviewer_user_id", nullable = false)
    private UUID reviewerUserId;

    @Column(nullable = false)
    private String decision;

    @Column
    private String notes;

    @Column(name = "reviewed_at", nullable = false)
    private Instant reviewedAt = Instant.now();

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getProctoringEventId() { return proctoringEventId; }
    public void setProctoringEventId(UUID proctoringEventId) { this.proctoringEventId = proctoringEventId; }
    public UUID getSessionId() { return sessionId; }
    public void setSessionId(UUID sessionId) { this.sessionId = sessionId; }
    public UUID getReviewerUserId() { return reviewerUserId; }
    public void setReviewerUserId(UUID reviewerUserId) { this.reviewerUserId = reviewerUserId; }
    public String getDecision() { return decision; }
    public void setDecision(String decision) { this.decision = decision; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public Instant getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(Instant reviewedAt) { this.reviewedAt = reviewedAt; }
}
