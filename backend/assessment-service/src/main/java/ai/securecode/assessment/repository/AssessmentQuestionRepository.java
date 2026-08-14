package ai.securecode.assessment.repository;

import ai.securecode.assessment.entity.AssessmentQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface AssessmentQuestionRepository extends JpaRepository<AssessmentQuestion, UUID> {
    List<AssessmentQuestion> findByAssessmentIdOrderByDisplayOrder(UUID assessmentId);
    boolean existsByAssessmentIdAndQuestionId(UUID assessmentId, UUID questionId);
}
