package ai.securecode.proctoring.repository;

import ai.securecode.proctoring.entity.ProctoringEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProctoringEventRepository extends JpaRepository<ProctoringEvent, ai.securecode.proctoring.entity.ProctoringEventId> {
    List<ProctoringEvent> findBySessionIdOrderByOccurredAtAsc(UUID sessionId);
    Optional<ProctoringEvent> findFirstById(UUID id);
}
