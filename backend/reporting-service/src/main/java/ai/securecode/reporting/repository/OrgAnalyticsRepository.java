package ai.securecode.reporting.repository;

import ai.securecode.reporting.entity.OrgAnalytics;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface OrgAnalyticsRepository extends JpaRepository<OrgAnalytics, UUID> {
    Optional<OrgAnalytics> findByOrgId(UUID orgId);
}
