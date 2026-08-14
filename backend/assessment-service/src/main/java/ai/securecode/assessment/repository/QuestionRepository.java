package ai.securecode.assessment.repository;

import ai.securecode.assessment.entity.Question;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface QuestionRepository extends JpaRepository<Question, UUID> {
    List<Question> findByOrgIdAndTypeOrderByCreatedAtDesc(UUID orgId, String type);
    List<Question> findByOrgIdOrderByCreatedAtDesc(UUID orgId);
    List<Question> findByOrgIdAndStatusOrderByCreatedAtDesc(UUID orgId, String status);
    List<Question> findByOrgIdAndTypeAndStatus(UUID orgId, String type, String status);
    List<Question> findByTypeAndStatusOrderByCreatedAtDesc(String type, String status);
    List<Question> findByStatusOrderByCreatedAtDesc(String status);
    Page<Question> findByOrgIdOrderByCreatedAtDesc(UUID orgId, Pageable pageable);
}
