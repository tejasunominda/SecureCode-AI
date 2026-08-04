package ai.securecode.assessment.repository;

import ai.securecode.assessment.entity.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface QuestionRepository extends JpaRepository<Question, UUID> {
    List<Question> findByOrgIdAndTypeOrderByCreatedAtDesc(UUID orgId, String type);
    List<Question> findByOrgIdAndStatusOrderByCreatedAtDesc(UUID orgId, String status);
    List<Question> findByOrgIdAndTypeAndStatus(UUID orgId, String type, String status);
}
