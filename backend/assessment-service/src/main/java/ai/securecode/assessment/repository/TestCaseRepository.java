package ai.securecode.assessment.repository;

import ai.securecode.assessment.entity.TestCase;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TestCaseRepository extends JpaRepository<TestCase, UUID> {
    List<TestCase> findByQuestionId(UUID questionId);
    List<TestCase> findByQuestionIdAndHidden(UUID questionId, boolean hidden);
    void deleteByQuestionId(UUID questionId);
}
