package ai.securecode.assessment.repository;

import ai.securecode.assessment.entity.AssessmentSession;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AssessmentSessionRepository extends JpaRepository<AssessmentSession, UUID> {
    Optional<AssessmentSession> findByLinkId(UUID linkId);
    List<AssessmentSession> findByOrgIdOrderByCreatedAtDesc(UUID orgId);
    Page<AssessmentSession> findByOrgIdOrderByCreatedAtDesc(UUID orgId, Pageable pageable);
}
