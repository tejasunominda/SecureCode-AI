package ai.securecode.assessment.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "session_draft")
public class SessionDraft {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "session_id", nullable = false, unique = true)
    private UUID sessionId;

    @Column(name = "current_section")
    private String currentSection;

    @Column(name = "current_question_index")
    private Integer currentQuestionIndex;

    @Column(columnDefinition = "TEXT")
    private String code;

    private String language;

    @Column(columnDefinition = "TEXT")
    private String answersJson;

    @Column(name = "saved_at", nullable = false)
    private Instant savedAt = Instant.now();

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getSessionId() { return sessionId; }
    public void setSessionId(UUID sessionId) { this.sessionId = sessionId; }
    public String getCurrentSection() { return currentSection; }
    public void setCurrentSection(String currentSection) { this.currentSection = currentSection; }
    public Integer getCurrentQuestionIndex() { return currentQuestionIndex; }
    public void setCurrentQuestionIndex(Integer currentQuestionIndex) { this.currentQuestionIndex = currentQuestionIndex; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }
    public String getAnswersJson() { return answersJson; }
    public void setAnswersJson(String answersJson) { this.answersJson = answersJson; }
    public Instant getSavedAt() { return savedAt; }
    public void setSavedAt(Instant savedAt) { this.savedAt = savedAt; }
}
