package ai.securecode.assessment.repository;

import ai.securecode.assessment.entity.Assessment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AssessmentRepository extends JpaRepository<Assessment, UUID> {
    List<Assessment> findByOrgId(UUID orgId);
    List<Assessment> findByOrgIdAndTemplateId(UUID orgId, UUID templateId);
}
