package ai.securecode.assessment.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "assessment_question")
public class AssessmentQuestion {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "assessment_id", nullable = false)
    private UUID assessmentId;

    @Column(name = "question_id", nullable = false)
    private UUID questionId;

    @Column(nullable = false)
    private java.math.BigDecimal weight = java.math.BigDecimal.ONE;

    @Column(name = "display_order", nullable = false)
    private int displayOrder = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getAssessmentId() { return assessmentId; }
    public void setAssessmentId(UUID assessmentId) { this.assessmentId = assessmentId; }
    public UUID getQuestionId() { return questionId; }
    public void setQuestionId(UUID questionId) { this.questionId = questionId; }
    public java.math.BigDecimal getWeight() { return weight; }
    public void setWeight(java.math.BigDecimal weight) { this.weight = weight; }
    public int getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(int displayOrder) { this.displayOrder = displayOrder; }
    public Instant getCreatedAt() { return createdAt; }
}
