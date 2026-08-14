package ai.securecode.reporting.repository;

import ai.securecode.reporting.entity.SkillGapAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface SkillGapAnalysisRepository extends JpaRepository<SkillGapAnalysis, UUID> {
    List<SkillGapAnalysis> findByOrgId(UUID orgId);
}
