package ai.securecode.assessment.repository;

import ai.securecode.assessment.entity.AssessmentLink;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AssessmentLinkRepository extends JpaRepository<AssessmentLink, UUID> {
    Optional<AssessmentLink> findByToken(String token);
    List<AssessmentLink> findByOrgIdOrderByCreatedAtDesc(UUID orgId);
    Optional<AssessmentLink> findByApplicantId(UUID applicantId);
}
