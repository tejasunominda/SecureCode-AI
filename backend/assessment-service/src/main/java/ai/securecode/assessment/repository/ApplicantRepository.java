package ai.securecode.assessment.repository;

import ai.securecode.assessment.entity.Applicant;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ApplicantRepository extends JpaRepository<Applicant, UUID> {
    List<Applicant> findByOrgIdOrderByCreatedAtDesc(UUID orgId);
    List<Applicant> findByOrgIdAndStatusOrderByCreatedAtDesc(UUID orgId, String status);
    Page<Applicant> findByOrgIdOrderByCreatedAtDesc(UUID orgId, Pageable pageable);
}
