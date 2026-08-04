package ai.securecode.assessment.repository;

import ai.securecode.assessment.entity.HiringDecision;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface HiringDecisionRepository extends JpaRepository<HiringDecision, UUID> {
    Optional<HiringDecision> findBySessionId(UUID sessionId);
}
