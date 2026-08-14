package ai.securecode.assessment.repository;

import ai.securecode.assessment.entity.CodingSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface CodingSubmissionRepository extends JpaRepository<CodingSubmission, UUID> {
    List<CodingSubmission> findBySessionId(UUID sessionId);
    List<CodingSubmission> findBySessionIdAndQuestionId(UUID sessionId, UUID questionId);
}
