package ai.securecode.reporting.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "question_analytics")
public class QuestionAnalytics {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "org_id", nullable = false)
    private UUID orgId;

    @Column(name = "question_id", nullable = false)
    private UUID questionId;

    @Column(name = "question_type")
    private String questionType;

    @Column
    private String difficulty;

    @Column(name = "times_attempted", nullable = false)
    private int timesAttempted;

    @Column(name = "correct_count", nullable = false)
    private int correctCount;

    @Column(name = "avg_time_ms")
    private long avgTimeMs;

    @Column(name = "discrimination_index")
    private BigDecimal discriminationIndex;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getOrgId() { return orgId; }
    public void setOrgId(UUID orgId) { this.orgId = orgId; }
    public UUID getQuestionId() { return questionId; }
    public void setQuestionId(UUID questionId) { this.questionId = questionId; }
    public String getQuestionType() { return questionType; }
    public void setQuestionType(String questionType) { this.questionType = questionType; }
    public String getDifficulty() { return difficulty; }
    public void setDifficulty(String difficulty) { this.difficulty = difficulty; }
    public int getTimesAttempted() { return timesAttempted; }
    public void setTimesAttempted(int timesAttempted) { this.timesAttempted = timesAttempted; }
    public int getCorrectCount() { return correctCount; }
    public void setCorrectCount(int correctCount) { this.correctCount = correctCount; }
    public long getAvgTimeMs() { return avgTimeMs; }
    public void setAvgTimeMs(long avgTimeMs) { this.avgTimeMs = avgTimeMs; }
    public BigDecimal getDiscriminationIndex() { return discriminationIndex; }
    public void setDiscriminationIndex(BigDecimal discriminationIndex) { this.discriminationIndex = discriminationIndex; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
