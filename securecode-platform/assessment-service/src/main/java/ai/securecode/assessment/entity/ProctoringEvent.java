package ai.securecode.assessment.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "proctoring_event")
public class ProctoringEvent {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "session_id", nullable = false)
    private UUID sessionId;

    @Column(name = "event_type", nullable = false)
    private String eventType;

    @Column(name = "warning_number")
    private int warningNumber;

    @Column(name = "screenshot_data", length = 2147483647)
    private String screenshotData;

    @Column(name = "audio_data", length = 2147483647)
    private String audioData;

    @Column(name = "detail")
    private String detail;

    @Column(name = "occurred_at", nullable = false, updatable = false)
    private Instant occurredAt = Instant.now();

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getSessionId() { return sessionId; }
    public void setSessionId(UUID sessionId) { this.sessionId = sessionId; }
    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }
    public int getWarningNumber() { return warningNumber; }
    public void setWarningNumber(int warningNumber) { this.warningNumber = warningNumber; }
    public String getScreenshotData() { return screenshotData; }
    public void setScreenshotData(String screenshotData) { this.screenshotData = screenshotData; }
    public String getAudioData() { return audioData; }
    public void setAudioData(String audioData) { this.audioData = audioData; }
    public String getDetail() { return detail; }
    public void setDetail(String detail) { this.detail = detail; }
    public Instant getOccurredAt() { return occurredAt; }
}
