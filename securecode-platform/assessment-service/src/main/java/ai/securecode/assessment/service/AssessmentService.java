package ai.securecode.assessment.service;

import ai.securecode.assessment.dto.*;
import ai.securecode.assessment.entity.*;
import ai.securecode.assessment.repository.*;
import ai.securecode.common.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class AssessmentService {

    private final ApplicantRepository applicantRepo;
    private final AssessmentTemplateRepository templateRepo;
    private final AssessmentLinkRepository linkRepo;
    private final AssessmentSessionRepository sessionRepo;
    private final QuestionRepository questionRepo;
    private final SectionResponseRepository sectionResponseRepo;
    private final CodingSubmissionRepository codingSubmissionRepo;
    private final ProctoringEventRepository proctoringEventRepo;
    private final HiringDecisionRepository hiringDecisionRepo;

    public AssessmentService(ApplicantRepository applicantRepo,
                             AssessmentTemplateRepository templateRepo,
                             AssessmentLinkRepository linkRepo,
                             AssessmentSessionRepository sessionRepo,
                             QuestionRepository questionRepo,
                             SectionResponseRepository sectionResponseRepo,
                             CodingSubmissionRepository codingSubmissionRepo,
                             ProctoringEventRepository proctoringEventRepo,
                             HiringDecisionRepository hiringDecisionRepo) {
        this.applicantRepo = applicantRepo;
        this.templateRepo = templateRepo;
        this.linkRepo = linkRepo;
        this.sessionRepo = sessionRepo;
        this.questionRepo = questionRepo;
        this.sectionResponseRepo = sectionResponseRepo;
        this.codingSubmissionRepo = codingSubmissionRepo;
        this.proctoringEventRepo = proctoringEventRepo;
        this.hiringDecisionRepo = hiringDecisionRepo;
    }

    // ─── Applicant Management ───

    public ApplicantResponse createApplicant(UUID orgId, CreateApplicantRequest req) {
        Applicant applicant = new Applicant();
        applicant.setOrgId(orgId);
        applicant.setName(req.name());
        applicant.setEmail(req.email());
        applicant.setResumeUrl(req.resumeUrl());
        applicant.setStatus("applied");
        applicant = applicantRepo.save(applicant);
        return toApplicantResponse(applicant);
    }

    public List<ApplicantResponse> listApplicants(UUID orgId) {
        return applicantRepo.findByOrgIdOrderByCreatedAtDesc(orgId).stream()
                .map(this::toApplicantResponse)
                .collect(Collectors.toList());
    }

    public ApplicantResponse shortlistApplicant(UUID applicantId) {
        Applicant applicant = applicantRepo.findById(applicantId)
                .orElseThrow(() -> new ApiException("APPLICANT_NOT_FOUND", HttpStatus.NOT_FOUND, "Applicant not found"));
        applicant.setStatus("shortlisted");
        applicant.setUpdatedAt(Instant.now());
        applicantRepo.save(applicant);
        return toApplicantResponse(applicant);
    }

    public ApplicantResponse rejectApplicant(UUID applicantId) {
        Applicant applicant = applicantRepo.findById(applicantId)
                .orElseThrow(() -> new ApiException("APPLICANT_NOT_FOUND", HttpStatus.NOT_FOUND, "Applicant not found"));
        applicant.setStatus("rejected");
        applicant.setUpdatedAt(Instant.now());
        applicantRepo.save(applicant);
        return toApplicantResponse(applicant);
    }

    // ─── Assessment Link Generation ───

    public AssessmentLinkResponse generateLink(UUID orgId, UUID createdBy, GenerateLinkRequest req) {
        Applicant applicant = applicantRepo.findById(req.applicantId())
                .orElseThrow(() -> new ApiException("APPLICANT_NOT_FOUND", HttpStatus.NOT_FOUND, "Applicant not found"));

        AssessmentTemplate template = templateRepo.findById(req.templateId())
                .orElseThrow(() -> new ApiException("TEMPLATE_NOT_FOUND", HttpStatus.NOT_FOUND, "Template not found"));

        AssessmentLink link = new AssessmentLink();
        link.setApplicantId(req.applicantId());
        link.setTemplateId(req.templateId());
        link.setOrgId(orgId);
        link.setToken(UUID.randomUUID().toString().replace("-", ""));
        link.setStatus("pending");
        link.setExpiresAt(Instant.now().plus(java.time.Duration.ofDays(req.expiryDays() > 0 ? req.expiryDays() : 5)));
        link.setCreatedBy(createdBy);
        link = linkRepo.save(link);

        applicant.setStatus("shortlisted");
        applicant.setUpdatedAt(Instant.now());
        applicantRepo.save(applicant);

        return new AssessmentLinkResponse(
                link.getId(), link.getApplicantId(), link.getTemplateId(),
                link.getToken(), link.getStatus(), link.getExpiresAt(),
                "/test/" + link.getToken()
        );
    }

    // ─── Candidate: Start Test via Link ───

    public AssessmentSession startTestByToken(String token) {
        AssessmentLink link = linkRepo.findByToken(token)
                .orElseThrow(() -> new ApiException("LINK_NOT_FOUND", HttpStatus.NOT_FOUND, "Invalid assessment link"));

        if ("used".equals(link.getStatus())) {
            throw new ApiException("LINK_ALREADY_USED", HttpStatus.BAD_REQUEST, "This assessment link has already been used");
        }
        if (link.getExpiresAt().isBefore(Instant.now())) {
            link.setStatus("expired");
            linkRepo.save(link);
            throw new ApiException("LINK_EXPIRED", HttpStatus.BAD_REQUEST, "This assessment link has expired");
        }

        AssessmentSession existing = sessionRepo.findByLinkId(link.getId()).orElse(null);
        if (existing != null && !"not_started".equals(existing.getStatus())) {
            throw new ApiException("SESSION_ALREADY_EXISTS", HttpStatus.BAD_REQUEST, "Test already in progress or submitted");
        }

        AssessmentSession session = new AssessmentSession();
        session.setLinkId(link.getId());
        session.setApplicantId(link.getApplicantId());
        session.setTemplateId(link.getTemplateId());
        session.setOrgId(link.getOrgId());
        session.setStatus("in_progress");
        session.setCurrentSection("aptitude");
        session.setStartedAt(Instant.now());
        session = sessionRepo.save(session);

        link.setStatus("used");
        linkRepo.save(link);

        return session;
    }

    // ─── Candidate: Submit MCQ Answer ───

    public SectionResponse submitAnswer(UUID sessionId, SubmitAnswerRequest req) {
        AssessmentSession session = sessionRepo.findById(sessionId)
                .orElseThrow(() -> new ApiException("SESSION_NOT_FOUND", HttpStatus.NOT_FOUND, "Session not found"));

        if ("submitted".equals(session.getStatus()) || session.getStatus().startsWith("terminated")) {
            throw new ApiException("SESSION_LOCKED", HttpStatus.BAD_REQUEST, "Session is locked");
        }

        Question question = questionRepo.findById(req.questionId())
                .orElseThrow(() -> new ApiException("QUESTION_NOT_FOUND", HttpStatus.NOT_FOUND, "Question not found"));

        SectionResponse response = new SectionResponse();
        response.setSessionId(sessionId);
        response.setQuestionId(req.questionId());
        response.setSelectedOption(req.selectedOption());
        boolean correct = req.selectedOption() != null && req.selectedOption().equals(question.getCorrectOption());
        response.setIsCorrect(correct);
        return sectionResponseRepo.save(response);
    }

    // ─── Candidate: Submit Code ───

    public CodingSubmission submitCode(UUID sessionId, SubmitCodeRequest req) {
        AssessmentSession session = sessionRepo.findById(sessionId)
                .orElseThrow(() -> new ApiException("SESSION_NOT_FOUND", HttpStatus.NOT_FOUND, "Session not found"));

        if ("submitted".equals(session.getStatus()) || session.getStatus().startsWith("terminated")) {
            throw new ApiException("SESSION_LOCKED", HttpStatus.BAD_REQUEST, "Session is locked");
        }

        CodingSubmission submission = new CodingSubmission();
        submission.setSessionId(sessionId);
        submission.setQuestionId(req.questionId());
        submission.setLanguage(req.language());
        submission.setCode(req.code());
        submission.setVisibleTestsPassed(0);
        submission.setHiddenTestsPassed(0);
        submission.setHiddenTestsTotal(0);
        submission.setRuntimeMs(0);
        return codingSubmissionRepo.save(submission);
    }

    // ─── Candidate: Submit/Finish Test ───

    public AssessmentSession submitTest(UUID sessionId) {
        AssessmentSession session = sessionRepo.findById(sessionId)
                .orElseThrow(() -> new ApiException("SESSION_NOT_FOUND", HttpStatus.NOT_FOUND, "Session not found"));

        session.setStatus("submitted");
        session.setSubmittedAt(Instant.now());
        return sessionRepo.save(session);
    }

    // ─── Proctoring Events ───

    public ProctoringEvent recordProctoringEvent(UUID sessionId, String eventType) {
        return recordProctoringEvent(sessionId, eventType, null, null, null);
    }

    public ProctoringEvent recordProctoringEvent(UUID sessionId, String eventType, String screenshotData, String audioData, String detail) {
        AssessmentSession session = sessionRepo.findById(sessionId)
                .orElseThrow(() -> new ApiException("SESSION_NOT_FOUND", HttpStatus.NOT_FOUND, "Session not found"));

        int warningCount = proctoringEventRepo.countBySessionIdAndEventType(sessionId, eventType);
        int newWarningNumber = warningCount + 1;

        ProctoringEvent event = new ProctoringEvent();
        event.setSessionId(sessionId);
        event.setEventType(eventType);
        event.setWarningNumber(newWarningNumber);
        event.setScreenshotData(screenshotData);
        event.setAudioData(audioData);
        event.setDetail(detail);
        proctoringEventRepo.save(event);

        if ("face_lost".equals(eventType) || "multi_face".equals(eventType)) {
            if (newWarningNumber >= 3) {
                session.setStatus("terminated_proctoring_violation");
                session.setSubmittedAt(Instant.now());
                sessionRepo.save(session);
            }
        } else if ("tab_switch".equals(eventType)) {
            if (newWarningNumber >= 2) {
                session.setStatus("terminated_tab_switch");
                session.setSubmittedAt(Instant.now());
                sessionRepo.save(session);
            }
        }

        return event;
    }

    // ─── Question Bank ───

    public QuestionResponse createQuestion(UUID orgId, UUID createdBy, CreateQuestionRequest req) {
        Question question = new Question();
        question.setOrgId(orgId);
        question.setType(req.type());
        question.setBody(req.body());
        question.setOptionA(req.optionA());
        question.setOptionB(req.optionB());
        question.setOptionC(req.optionC());
        question.setOptionD(req.optionD());
        question.setCorrectOption(req.correctOption());
        question.setDifficulty(req.difficulty() != null ? req.difficulty() : "easy");
        question.setTags(req.tags());
        question.setTestCases(req.testCases());
        question.setCreatedBy(createdBy);
        question.setStatus("draft");
        question = questionRepo.save(question);
        return toQuestionResponse(question);
    }

    public List<QuestionResponse> listQuestions(UUID orgId, String type) {
        if (type != null && !type.isEmpty()) {
            return questionRepo.findByOrgIdAndTypeOrderByCreatedAtDesc(orgId, type).stream()
                    .map(this::toQuestionResponse)
                    .collect(Collectors.toList());
        }
        return questionRepo.findByOrgIdAndStatusOrderByCreatedAtDesc(orgId, "published").stream()
                .map(this::toQuestionResponse)
                .collect(Collectors.toList());
    }

    public QuestionResponse publishQuestion(UUID questionId) {
        Question question = questionRepo.findById(questionId)
                .orElseThrow(() -> new ApiException("QUESTION_NOT_FOUND", HttpStatus.NOT_FOUND, "Question not found"));
        question.setStatus("published");
        question.setUpdatedAt(Instant.now());
        questionRepo.save(question);
        return toQuestionResponse(question);
    }

    // ─── Hiring Decision ───

    public HiringDecision makeHiringDecision(UUID sessionId, UUID decidedBy, HiringDecisionRequest req) {
        AssessmentSession session = sessionRepo.findById(sessionId)
                .orElseThrow(() -> new ApiException("SESSION_NOT_FOUND", HttpStatus.NOT_FOUND, "Session not found"));

        if (!"submitted".equals(session.getStatus()) && !session.getStatus().startsWith("terminated")) {
            throw new ApiException("SESSION_NOT_SUBMITTED", HttpStatus.BAD_REQUEST, "Cannot decide before submission");
        }

        hiringDecisionRepo.findBySessionId(sessionId).ifPresent(existing -> {
            throw new ApiException("DECISION_ALREADY_EXISTS", HttpStatus.BAD_REQUEST, "Hiring decision already recorded");
        });

        HiringDecision decision = new HiringDecision();
        decision.setSessionId(sessionId);
        decision.setDecision(req.decision());
        decision.setDecidedBy(decidedBy);
        decision.setTechnicalManagerNotes(req.technicalManagerNotes());
        return hiringDecisionRepo.save(decision);
    }

    // ─── Session Report ───

    public SessionReportResponse getSessionReport(UUID sessionId) {
        AssessmentSession session = sessionRepo.findById(sessionId)
                .orElseThrow(() -> new ApiException("SESSION_NOT_FOUND", HttpStatus.NOT_FOUND, "Session not found"));

        Applicant applicant = applicantRepo.findById(session.getApplicantId())
                .orElseThrow(() -> new ApiException("APPLICANT_NOT_FOUND", HttpStatus.NOT_FOUND, "Applicant not found"));

        List<SectionResponse> responses = sectionResponseRepo.findBySessionId(sessionId);
        int aptitudeCorrect = 0, aptitudeTotal = 0, reasoningCorrect = 0, reasoningTotal = 0;

        for (SectionResponse sr : responses) {
            Question q = questionRepo.findById(sr.getQuestionId()).orElse(null);
            if (q == null) continue;
            if ("aptitude".equals(q.getType())) {
                aptitudeTotal++;
                if (Boolean.TRUE.equals(sr.getIsCorrect())) aptitudeCorrect++;
            } else if ("reasoning".equals(q.getType())) {
                reasoningTotal++;
                if (Boolean.TRUE.equals(sr.getIsCorrect())) reasoningCorrect++;
            }
        }

        List<CodingSubmission> codingSubs = codingSubmissionRepo.findBySessionId(sessionId);
        List<SessionReportResponse.CodingResultDetail> codingResults = codingSubs.stream()
                .map(cs -> new SessionReportResponse.CodingResultDetail(
                        cs.getQuestionId(), cs.getLanguage(), cs.getCode(),
                        cs.getVisibleTestsPassed(), cs.getHiddenTestsPassed(),
                        cs.getHiddenTestsTotal(), cs.getRuntimeMs()))
                .collect(Collectors.toList());

        List<ProctoringEvent> events = proctoringEventRepo.findBySessionIdOrderByOccurredAtAsc(sessionId);
        List<SessionReportResponse.ProctoringEventDetail> eventDetails = events.stream()
                .map(e -> new SessionReportResponse.ProctoringEventDetail(
                        e.getEventType(), e.getWarningNumber(), e.getOccurredAt()))
                .collect(Collectors.toList());

        HiringDecision decision = hiringDecisionRepo.findBySessionId(sessionId).orElse(null);

        return new SessionReportResponse(
                session.getId(), session.getApplicantId(),
                applicant.getName(), applicant.getEmail(),
                session.getStatus(), session.getStartedAt(), session.getSubmittedAt(),
                aptitudeCorrect, aptitudeTotal,
                reasoningCorrect, reasoningTotal,
                codingResults, eventDetails,
                decision != null ? decision.getDecision() : null,
                decision != null ? decision.getTechnicalManagerNotes() : null
        );
    }

    public List<SessionReportResponse> listSessions(UUID orgId) {
        return sessionRepo.findByOrgIdOrderByCreatedAtDesc(orgId).stream()
                .map(s -> getSessionReport(s.getId()))
                .collect(Collectors.toList());
    }

    // ─── Helpers ───

    private ApplicantResponse toApplicantResponse(Applicant a) {
        return new ApplicantResponse(a.getId(), a.getName(), a.getEmail(),
                a.getResumeUrl(), a.getStatus(), a.getCreatedAt());
    }

    private QuestionResponse toQuestionResponse(Question q) {
        return new QuestionResponse(q.getId(), q.getType(), q.getBody(),
                q.getOptionA(), q.getOptionB(), q.getOptionC(), q.getOptionD(),
                q.getCorrectOption(), q.getDifficulty(), q.getTags(),
                q.getTestCases(), q.getStatus(), q.getVersion(), q.getCreatedAt());
    }
}
