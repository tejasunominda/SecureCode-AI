package ai.securecode.assessment.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "hiring_decision")
public class HiringDecision {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "session_id", nullable = false)
    private UUID sessionId;

    @Column(nullable = false)
    private String decision;

    @Column(name = "decided_by", nullable = false)
    private UUID decidedBy;

    @Column(name = "technical_manager_notes", columnDefinition = "TEXT")
    private String technicalManagerNotes;

    @Column(name = "decided_at", nullable = false, updatable = false)
    private Instant decidedAt = Instant.now();

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getSessionId() { return sessionId; }
    public void setSessionId(UUID sessionId) { this.sessionId = sessionId; }
    public String getDecision() { return decision; }
    public void setDecision(String decision) { this.decision = decision; }
    public UUID getDecidedBy() { return decidedBy; }
    public void setDecidedBy(UUID decidedBy) { this.decidedBy = decidedBy; }
    public String getTechnicalManagerNotes() { return technicalManagerNotes; }
    public void setTechnicalManagerNotes(String technicalManagerNotes) { this.technicalManagerNotes = technicalManagerNotes; }
    public Instant getDecidedAt() { return decidedAt; }
}
