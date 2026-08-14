package ai.securecode.assessment.service;

import ai.securecode.assessment.dto.CreateAssessmentRequest;
import ai.securecode.assessment.dto.CreateTestCaseRequest;
import ai.securecode.assessment.dto.AttachQuestionRequest;
import ai.securecode.assessment.dto.BulkInviteRequest;
import ai.securecode.assessment.dto.BulkInviteResponse;
import ai.securecode.assessment.entity.Assessment;
import ai.securecode.assessment.entity.AssessmentQuestion;
import ai.securecode.assessment.entity.AssessmentTemplate;
import ai.securecode.assessment.entity.Applicant;
import ai.securecode.assessment.entity.AssessmentLink;
import ai.securecode.assessment.entity.TestCase;
import ai.securecode.assessment.repository.*;
import ai.securecode.common.exception.ApiException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AssessmentServiceTest {

    @Mock private ApplicantRepository applicantRepo;
    @Mock private AssessmentTemplateRepository templateRepo;
    @Mock private AssessmentLinkRepository linkRepo;
    @Mock private AssessmentSessionRepository sessionRepo;
    @Mock private QuestionRepository questionRepo;
    @Mock private SectionResponseRepository sectionResponseRepo;
    @Mock private CodingSubmissionRepository codingSubmissionRepo;
    @Mock private ProctoringEventRepository proctoringEventRepo;
    @Mock private HiringDecisionRepository hiringDecisionRepo;
    @Mock private SessionDraftRepository sessionDraftRepo;
    @Mock private TestCaseRepository testCaseRepo;
    @Mock private AssessmentRepository assessmentRepo;
    @Mock private AssessmentQuestionRepository assessmentQuestionRepo;

    @InjectMocks
    private AssessmentService service;

    private UUID orgId;
    private UUID createdBy;
    private UUID templateId;

    @BeforeEach
    void setUp() {
        orgId = UUID.randomUUID();
        createdBy = UUID.randomUUID();
        templateId = UUID.randomUUID();
    }

    @Test
    void createAssessment_savesWithDefaults() {
        when(assessmentRepo.save(any(Assessment.class))).thenAnswer(inv -> {
            Assessment a = inv.getArgument(0);
            a.setId(UUID.randomUUID());
            return a;
        });

        CreateAssessmentRequest req = new CreateAssessmentRequest(
                "Java Backend Assessment", templateId, null, null);

        Assessment result = service.createAssessment(orgId, createdBy, req);

        assertEquals("Java Backend Assessment", result.getName());
        assertEquals("standard", result.getProctoringLevel());
        assertNotNull(result.getScoringConfig());
        verify(assessmentRepo).save(any());
    }

    @Test
    void lockAssessment_setsLockedAt() {
        UUID assessmentId = UUID.randomUUID();
        Assessment assessment = new Assessment();
        assessment.setId(assessmentId);
        assessment.setOrgId(orgId);
        assessment.setName("Test Assessment");

        when(assessmentRepo.findById(assessmentId)).thenReturn(Optional.of(assessment));
        when(assessmentRepo.save(any(Assessment.class))).thenAnswer(inv -> inv.getArgument(0));

        Assessment result = service.lockAssessment(assessmentId);

        assertNotNull(result.getLockedAt());
        assertTrue(result.isLocked());
    }

    @Test
    void lockAssessment_throwsIfAlreadyLocked() {
        UUID assessmentId = UUID.randomUUID();
        Assessment assessment = new Assessment();
        assessment.setId(assessmentId);
        assessment.setLockedAt(Instant.now());

        when(assessmentRepo.findById(assessmentId)).thenReturn(Optional.of(assessment));

        ApiException ex = assertThrows(ApiException.class, () -> service.lockAssessment(assessmentId));
        assertEquals("ALREADY_LOCKED", ex.getCode());
        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
    }

    @Test
    void addTestCase_savesWithDefaults() {
        UUID questionId = UUID.randomUUID();
        when(testCaseRepo.save(any(TestCase.class))).thenAnswer(inv -> {
            TestCase tc = inv.getArgument(0);
            tc.setId(UUID.randomUUID());
            return tc;
        });

        CreateTestCaseRequest req = new CreateTestCaseRequest(
                "1 2 3", "6", true, null);

        TestCase result = service.addTestCase(questionId, req);

        assertEquals(questionId, result.getQuestionId());
        assertTrue(result.isHidden());
        assertEquals(BigDecimal.ONE, result.getWeight());
    }

    @Test
    void getTestCases_excludesHiddenWhenFlagFalse() {
        UUID questionId = UUID.randomUUID();
        TestCase visible = new TestCase();
        visible.setHidden(false);
        visible.setInput("test");

        when(testCaseRepo.findByQuestionIdAndHidden(questionId, false))
                .thenReturn(List.of(visible));

        List<TestCase> results = service.getTestCases(questionId, false);

        assertEquals(1, results.size());
        assertFalse(results.get(0).isHidden());
        verify(testCaseRepo).findByQuestionIdAndHidden(questionId, false);
        verify(testCaseRepo, never()).findByQuestionId(any());
    }

    @Test
    void getTestCases_includesHiddenWhenFlagTrue() {
        UUID questionId = UUID.randomUUID();
        TestCase visible = new TestCase();
        visible.setHidden(false);
        TestCase hidden = new TestCase();
        hidden.setHidden(true);

        when(testCaseRepo.findByQuestionId(questionId))
                .thenReturn(List.of(visible, hidden));

        List<TestCase> results = service.getTestCases(questionId, true);

        assertEquals(2, results.size());
        verify(testCaseRepo).findByQuestionId(questionId);
    }

    @Test
    void attachQuestion_savesWithDefaults() {
        UUID assessmentId = UUID.randomUUID();
        UUID questionId = UUID.randomUUID();
        Assessment assessment = new Assessment();
        assessment.setId(assessmentId);
        assessment.setOrgId(orgId);
        assessment.setTemplateId(templateId);
        assessment.setName("Test");

        when(assessmentRepo.findById(assessmentId)).thenReturn(Optional.of(assessment));
        when(assessmentQuestionRepo.existsByAssessmentIdAndQuestionId(assessmentId, questionId)).thenReturn(false);
        when(assessmentQuestionRepo.save(any(AssessmentQuestion.class))).thenAnswer(inv -> {
            AssessmentQuestion aq = inv.getArgument(0);
            aq.setId(UUID.randomUUID());
            return aq;
        });

        AttachQuestionRequest req = new AttachQuestionRequest(questionId, null, null);
        AssessmentQuestion result = service.attachQuestion(assessmentId, req);

        assertEquals(assessmentId, result.getAssessmentId());
        assertEquals(questionId, result.getQuestionId());
        assertEquals(BigDecimal.ONE, result.getWeight());
        assertEquals(0, result.getDisplayOrder());
    }

    @Test
    void attachQuestion_throwsWhenAssessmentLocked() {
        UUID assessmentId = UUID.randomUUID();
        UUID questionId = UUID.randomUUID();
        Assessment assessment = new Assessment();
        assessment.setId(assessmentId);
        assessment.setLockedAt(Instant.now());

        when(assessmentRepo.findById(assessmentId)).thenReturn(Optional.of(assessment));

        AttachQuestionRequest req = new AttachQuestionRequest(questionId, null, null);
        ApiException ex = assertThrows(ApiException.class, () -> service.attachQuestion(assessmentId, req));
        assertEquals("ASSESSMENT_LOCKED", ex.getCode());
    }

    @Test
    void attachQuestion_throwsWhenDuplicate() {
        UUID assessmentId = UUID.randomUUID();
        UUID questionId = UUID.randomUUID();
        Assessment assessment = new Assessment();
        assessment.setId(assessmentId);

        when(assessmentRepo.findById(assessmentId)).thenReturn(Optional.of(assessment));
        when(assessmentQuestionRepo.existsByAssessmentIdAndQuestionId(assessmentId, questionId)).thenReturn(true);

        AttachQuestionRequest req = new AttachQuestionRequest(questionId, null, null);
        ApiException ex = assertThrows(ApiException.class, () -> service.attachQuestion(assessmentId, req));
        assertEquals("DUPLICATE", ex.getCode());
    }

    @Test
    void bulkInvite_createsApplicantsAndLinks() {
        UUID assessmentId = UUID.randomUUID();
        Assessment assessment = new Assessment();
        assessment.setId(assessmentId);
        assessment.setOrgId(orgId);
        assessment.setTemplateId(templateId);

        when(assessmentRepo.findById(assessmentId)).thenReturn(Optional.of(assessment));
        when(applicantRepo.save(any(Applicant.class))).thenAnswer(inv -> {
            Applicant a = inv.getArgument(0);
            a.setId(UUID.randomUUID());
            return a;
        });
        when(linkRepo.save(any(AssessmentLink.class))).thenAnswer(inv -> {
            AssessmentLink l = inv.getArgument(0);
            l.setId(UUID.randomUUID());
            return l;
        });

        BulkInviteRequest req = new BulkInviteRequest(List.of(
                new BulkInviteRequest.CandidateInvite("Alice", "alice@test.com"),
                new BulkInviteRequest.CandidateInvite("Bob", "bob@test.com")
        ));

        BulkInviteResponse result = service.bulkInvite(orgId, createdBy, assessmentId, req);

        assertEquals(2, result.totalInvited());
        assertEquals(2, result.tokens().size());
        assertTrue(result.errors().isEmpty());
    }
}
