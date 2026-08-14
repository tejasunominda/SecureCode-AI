package ai.securecode.assessment.repository;

import ai.securecode.assessment.entity.SectionResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface SectionResponseRepository extends JpaRepository<SectionResponse, UUID> {
    List<SectionResponse> findBySessionId(UUID sessionId);
}
