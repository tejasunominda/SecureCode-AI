package ai.securecode.assessment.repository;

import ai.securecode.assessment.entity.QuestionVersionHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface QuestionVersionHistoryRepository extends JpaRepository<QuestionVersionHistory, UUID> {
    List<QuestionVersionHistory> findByQuestionIdOrderByVersionDesc(UUID questionId);
}
