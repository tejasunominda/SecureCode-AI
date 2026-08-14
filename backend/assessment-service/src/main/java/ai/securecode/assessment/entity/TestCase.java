package ai.securecode.assessment.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "test_case")
public class TestCase {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "question_id", nullable = false)
    private UUID questionId;

    @Column(columnDefinition = "TEXT")
    private String input;

    @Column(name = "expected_output", columnDefinition = "TEXT")
    private String expectedOutput;

    @Column(name = "is_hidden", nullable = false)
    private boolean hidden = false;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal weight = BigDecimal.ONE;

    @Column(name = "judge_type", nullable = false)
    private String judgeType = "exact";

    @Column(name = "judge_code", columnDefinition = "TEXT")
    private String judgeCode;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getQuestionId() { return questionId; }
    public void setQuestionId(UUID questionId) { this.questionId = questionId; }
    public String getInput() { return input; }
    public void setInput(String input) { this.input = input; }
    public String getExpectedOutput() { return expectedOutput; }
    public void setExpectedOutput(String expectedOutput) { this.expectedOutput = expectedOutput; }
    public boolean isHidden() { return hidden; }
    public void setHidden(boolean hidden) { this.hidden = hidden; }
    public BigDecimal getWeight() { return weight; }
    public void setWeight(BigDecimal weight) { this.weight = weight; }
    public String getJudgeType() { return judgeType; }
    public void setJudgeType(String judgeType) { this.judgeType = judgeType; }
    public String getJudgeCode() { return judgeCode; }
    public void setJudgeCode(String judgeCode) { this.judgeCode = judgeCode; }
    public Instant getCreatedAt() { return createdAt; }
}
