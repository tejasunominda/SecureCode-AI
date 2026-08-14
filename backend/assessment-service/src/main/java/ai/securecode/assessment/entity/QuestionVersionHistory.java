package ai.securecode.assessment.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "question_version_history")
public class QuestionVersionHistory {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "question_id", nullable = false)
    private UUID questionId;

    @Column(name = "org_id", nullable = false)
    private UUID orgId;

    @Column(nullable = false)
    private int version;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    @Column(name = "option_a")
    private String optionA;

    @Column(name = "option_b")
    private String optionB;

    @Column(name = "option_c")
    private String optionC;

    @Column(name = "option_d")
    private String optionD;

    @Column(name = "correct_option")
    private String correctOption;

    @Column(nullable = false)
    private String difficulty;

    @Column(name = "test_cases", columnDefinition = "TEXT")
    private String testCases;

    @Column(name = "hidden_test_cases", columnDefinition = "TEXT")
    private String hiddenTestCases;

    @Column(name = "changed_by", nullable = false)
    private UUID changedBy;

    @Column(name = "changed_at", nullable = false, updatable = false)
    private Instant changedAt = Instant.now();

    @Column(name = "change_summary")
    private String changeSummary;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getQuestionId() { return questionId; }
    public void setQuestionId(UUID questionId) { this.questionId = questionId; }
    public UUID getOrgId() { return orgId; }
    public void setOrgId(UUID orgId) { this.orgId = orgId; }
    public int getVersion() { return version; }
    public void setVersion(int version) { this.version = version; }
    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }
    public String getOptionA() { return optionA; }
    public void setOptionA(String optionA) { this.optionA = optionA; }
    public String getOptionB() { return optionB; }
    public void setOptionB(String optionB) { this.optionB = optionB; }
    public String getOptionC() { return optionC; }
    public void setOptionC(String optionC) { this.optionC = optionC; }
    public String getOptionD() { return optionD; }
    public void setOptionD(String optionD) { this.optionD = optionD; }
    public String getCorrectOption() { return correctOption; }
    public void setCorrectOption(String correctOption) { this.correctOption = correctOption; }
    public String getDifficulty() { return difficulty; }
    public void setDifficulty(String difficulty) { this.difficulty = difficulty; }
    public String getTestCases() { return testCases; }
    public void setTestCases(String testCases) { this.testCases = testCases; }
    public String getHiddenTestCases() { return hiddenTestCases; }
    public void setHiddenTestCases(String hiddenTestCases) { this.hiddenTestCases = hiddenTestCases; }
    public UUID getChangedBy() { return changedBy; }
    public void setChangedBy(UUID changedBy) { this.changedBy = changedBy; }
    public Instant getChangedAt() { return changedAt; }
    public String getChangeSummary() { return changeSummary; }
    public void setChangeSummary(String changeSummary) { this.changeSummary = changeSummary; }
}
