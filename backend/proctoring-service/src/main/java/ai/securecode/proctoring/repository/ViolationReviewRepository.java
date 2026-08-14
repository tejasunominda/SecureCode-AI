package ai.securecode.proctoring.repository;

import ai.securecode.proctoring.entity.ViolationReview;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ViolationReviewRepository extends JpaRepository<ViolationReview, UUID> {
    List<ViolationReview> findBySessionId(UUID sessionId);
}
