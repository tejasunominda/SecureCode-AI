package ai.securecode.assessment.repository;

import ai.securecode.assessment.entity.ProctoringEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ProctoringEventRepository extends JpaRepository<ProctoringEvent, UUID> {
    List<ProctoringEvent> findBySessionIdOrderByOccurredAtAsc(UUID sessionId);
    int countBySessionIdAndEventType(UUID sessionId, String eventType);
}
