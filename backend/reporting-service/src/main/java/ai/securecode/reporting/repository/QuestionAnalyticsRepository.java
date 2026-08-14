package ai.securecode.reporting.repository;

import ai.securecode.reporting.entity.QuestionAnalytics;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface QuestionAnalyticsRepository extends JpaRepository<QuestionAnalytics, UUID> {
    List<QuestionAnalytics> findByOrgId(UUID orgId);
}
