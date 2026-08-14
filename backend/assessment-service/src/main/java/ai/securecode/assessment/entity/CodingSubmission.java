package ai.securecode.assessment.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "coding_submission")
public class CodingSubmission {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "session_id", nullable = false)
    private UUID sessionId;

    @Column(name = "question_id", nullable = false)
    private UUID questionId;

    @Column(nullable = false)
    private String language;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String code;

    @Column(name = "visible_tests_passed")
    private int visibleTestsPassed;

    @Column(name = "hidden_tests_passed")
    private int hiddenTestsPassed;

    @Column(name = "hidden_tests_total")
    private int hiddenTestsTotal;

    @Column(name = "runtime_ms")
    private long runtimeMs;

    @Column(name = "submitted_at", nullable = false, updatable = false)
    private Instant submittedAt = Instant.now();

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getSessionId() { return sessionId; }
    public void setSessionId(UUID sessionId) { this.sessionId = sessionId; }
    public UUID getQuestionId() { return questionId; }
    public void setQuestionId(UUID questionId) { this.questionId = questionId; }
    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public int getVisibleTestsPassed() { return visibleTestsPassed; }
    public void setVisibleTestsPassed(int visibleTestsPassed) { this.visibleTestsPassed = visibleTestsPassed; }
    public int getHiddenTestsPassed() { return hiddenTestsPassed; }
    public void setHiddenTestsPassed(int hiddenTestsPassed) { this.hiddenTestsPassed = hiddenTestsPassed; }
    public int getHiddenTestsTotal() { return hiddenTestsTotal; }
    public void setHiddenTestsTotal(int hiddenTestsTotal) { this.hiddenTestsTotal = hiddenTestsTotal; }
    public long getRuntimeMs() { return runtimeMs; }
    public void setRuntimeMs(long runtimeMs) { this.runtimeMs = runtimeMs; }
    public Instant getSubmittedAt() { return submittedAt; }
}
