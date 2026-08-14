package ai.securecode.proctoring.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "proctoring_event")
@IdClass(ProctoringEventId.class)
public class ProctoringEvent {

    @Id
    @Column(name = "id")
    private UUID id;

    @Id
    @Column(name = "occurred_at")
    private Instant occurredAt = Instant.now();

    @Column(name = "session_id", nullable = false)
    private UUID sessionId;

    @Column(name = "event_type", nullable = false)
    private String eventType;

    @Column(name = "source", nullable = false)
    private String source = "browser";

    @Column(name = "severity", nullable = false)
    private short severity = 1;

    @Column(name = "evidence_uri")
    private String evidenceUri;

    @Column(name = "confidence_score")
    private java.math.BigDecimal confidenceScore;

    @Column(name = "detection_metadata", columnDefinition = "jsonb")
    private String detectionMetadata;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Instant getOccurredAt() { return occurredAt; }
    public void setOccurredAt(Instant occurredAt) { this.occurredAt = occurredAt; }
    public UUID getSessionId() { return sessionId; }
    public void setSessionId(UUID sessionId) { this.sessionId = sessionId; }
    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public short getSeverity() { return severity; }
    public void setSeverity(short severity) { this.severity = severity; }
    public String getEvidenceUri() { return evidenceUri; }
    public void setEvidenceUri(String evidenceUri) { this.evidenceUri = evidenceUri; }
    public java.math.BigDecimal getConfidenceScore() { return confidenceScore; }
    public void setConfidenceScore(java.math.BigDecimal confidenceScore) { this.confidenceScore = confidenceScore; }
    public String getDetectionMetadata() { return detectionMetadata; }
    public void setDetectionMetadata(String detectionMetadata) { this.detectionMetadata = detectionMetadata; }
    public Instant getDeletedAt() { return deletedAt; }
    public void setDeletedAt(Instant deletedAt) { this.deletedAt = deletedAt; }
}
