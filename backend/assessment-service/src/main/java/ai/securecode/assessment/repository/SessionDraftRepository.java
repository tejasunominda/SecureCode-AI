package ai.securecode.assessment.repository;

import ai.securecode.assessment.entity.SessionDraft;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface SessionDraftRepository extends JpaRepository<SessionDraft, UUID> {
    Optional<SessionDraft> findBySessionId(UUID sessionId);
}
