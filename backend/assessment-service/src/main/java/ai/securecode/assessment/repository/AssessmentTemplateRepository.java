package ai.securecode.assessment.repository;

import ai.securecode.assessment.entity.AssessmentTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface AssessmentTemplateRepository extends JpaRepository<AssessmentTemplate, UUID> {
    List<AssessmentTemplate> findByOrgIdOrderByCreatedAtDesc(UUID orgId);
}
