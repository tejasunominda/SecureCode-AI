package ai.securecode.proctoring.repository;

import ai.securecode.proctoring.entity.RiskScoreSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface RiskScoreSnapshotRepository extends JpaRepository<RiskScoreSnapshot, UUID> {
    Optional<RiskScoreSnapshot> findBySessionId(UUID sessionId);
}
