package ai.securecode.assessment.service;

import ai.securecode.assessment.dto.*;
import ai.securecode.assessment.entity.*;
import ai.securecode.assessment.repository.*;
import ai.securecode.common.exception.ApiException;
import ai.securecode.common.dto.PageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
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
    private final SessionDraftRepository sessionDraftRepo;
    private final TestCaseRepository testCaseRepo;
    private final AssessmentRepository assessmentRepo;
    private final AssessmentQuestionRepository assessmentQuestionRepo;
    private final QuestionVersionHistoryRepository questionVersionHistoryRepo;
    private final QuestionBankImportMapper importMapper;

    public AssessmentService(ApplicantRepository applicantRepo,
                             AssessmentTemplateRepository templateRepo,
                             AssessmentLinkRepository linkRepo,
                             AssessmentSessionRepository sessionRepo,
                             QuestionRepository questionRepo,
                             SectionResponseRepository sectionResponseRepo,
                             CodingSubmissionRepository codingSubmissionRepo,
                             ProctoringEventRepository proctoringEventRepo,
                             HiringDecisionRepository hiringDecisionRepo,
                             SessionDraftRepository sessionDraftRepo,
                             TestCaseRepository testCaseRepo,
                             AssessmentRepository assessmentRepo,
                             AssessmentQuestionRepository assessmentQuestionRepo,
                             QuestionVersionHistoryRepository questionVersionHistoryRepo,
                             QuestionBankImportMapper importMapper) {
        this.applicantRepo = applicantRepo;
        this.templateRepo = templateRepo;
        this.linkRepo = linkRepo;
        this.sessionRepo = sessionRepo;
        this.questionRepo = questionRepo;
        this.sectionResponseRepo = sectionResponseRepo;
        this.codingSubmissionRepo = codingSubmissionRepo;
        this.proctoringEventRepo = proctoringEventRepo;
        this.hiringDecisionRepo = hiringDecisionRepo;
        this.sessionDraftRepo = sessionDraftRepo;
        this.testCaseRepo = testCaseRepo;
        this.assessmentRepo = assessmentRepo;
        this.assessmentQuestionRepo = assessmentQuestionRepo;
        this.questionVersionHistoryRepo = questionVersionHistoryRepo;
        this.importMapper = importMapper;
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

    public PageResponse<ApplicantResponse> listApplicantsPaged(UUID orgId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Applicant> p = applicantRepo.findByOrgIdOrderByCreatedAtDesc(orgId, pageable);
        List<ApplicantResponse> content = p.getContent().stream()
                .map(this::toApplicantResponse)
                .collect(Collectors.toList());
        return PageResponse.of(content, page, size, p.getTotalElements());
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

        List<Question> poolQuestions = questionRepo.findByOrgIdAndTypeAndStatus(
                link.getOrgId(), "coding", "published");
        List<Question> randomized = poolQuestions.stream()
                .filter(Question::isRandomizePool)
                .toList();
        if (!randomized.isEmpty()) {
            java.util.Collections.shuffle(randomized);
        }

        return session;
    }

    // ─── Candidate: Validate Link ───

    public void validateLink(String token) {
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

        if (correct) {
            response.setScoreAwarded(java.math.BigDecimal.ONE);
        } else if (req.selectedOption() != null && !req.selectedOption().isBlank()) {
            java.math.BigDecimal neg = question.getNegativeMarks();
            if (neg != null && neg.compareTo(java.math.BigDecimal.ZERO) > 0) {
                response.setScoreAwarded(neg.negate());
            } else {
                response.setScoreAwarded(java.math.BigDecimal.ZERO);
            }
        } else {
            response.setScoreAwarded(java.math.BigDecimal.ZERO);
        }

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

    // ─── Candidate: Run Code (evaluate against test cases) ───

    public RunCodeResponse runCode(UUID sessionId, SubmitCodeRequest req) {
        Question question = questionRepo.findById(req.questionId())
                .orElseThrow(() -> new ApiException("QUESTION_NOT_FOUND", HttpStatus.NOT_FOUND, "Question not found"));

        List<RunCodeResponse.TestCaseResult> visibleResults = parseAndEvaluate(
                question.getTestCases(), req.code(), req.language());
        List<RunCodeResponse.TestCaseResult> hiddenResults = parseAndEvaluate(
                question.getHiddenTestCases(), req.code(), req.language());

        int visiblePassed = (int) visibleResults.stream().filter(RunCodeResponse.TestCaseResult::passed).count();
        int hiddenPassed = (int) hiddenResults.stream().filter(RunCodeResponse.TestCaseResult::passed).count();

        return new RunCodeResponse(
                visiblePassed, visibleResults.size(),
                hiddenPassed, hiddenResults.size(),
                visibleResults, hiddenResults,
                visiblePassed == visibleResults.size() && !visibleResults.isEmpty(),
                hiddenPassed == hiddenResults.size() && !hiddenResults.isEmpty()
        );
    }

    private List<RunCodeResponse.TestCaseResult> parseAndEvaluate(String testCasesStr, String code, String language) {
        if (testCasesStr == null || testCasesStr.isBlank()) {
            return List.of();
        }

        List<RunCodeResponse.TestCaseResult> results = new java.util.ArrayList<>();
        javax.script.ScriptEngine engine = null;
        if ("javascript".equalsIgnoreCase(language)) {
            javax.script.ScriptEngineManager manager = new javax.script.ScriptEngineManager();
            engine = manager.getEngineByName("javascript");
        }

        for (String line : testCasesStr.split("\n")) {
            line = line.trim();
            if (line.isEmpty() || line.startsWith("#")) continue;

            String input = null;
            String expected = null;

            int arrowIdx = line.indexOf("=>");
            if (arrowIdx >= 0) {
                String before = line.substring(0, arrowIdx).trim();
                String after = line.substring(arrowIdx + 2).trim();

                int inputIdx = before.toLowerCase().indexOf("input:");
                if (inputIdx >= 0) {
                    input = before.substring(inputIdx + 6).trim();
                } else {
                    input = before;
                }

                int outputIdx = after.toLowerCase().indexOf("output:");
                if (outputIdx >= 0) {
                    expected = after.substring(outputIdx + 7).trim();
                } else {
                    expected = after;
                }
            }

            if (input == null || expected == null) continue;

            String actual = "";
            boolean passed = false;
            long startTime = System.nanoTime();

            if (engine != null) {
                try {
                    engine.eval(code);
                    Object result;
                    if (input.startsWith("\"") || input.startsWith("'")) {
                        String strInput = input.replaceAll("^['\"]|['\"]$", "");
                        result = engine.eval("solution(" + input + ")");
                    } else {
                        result = engine.eval("solution(" + input + ")");
                    }
                    actual = result != null ? result.toString() : "null";
                    String expectedClean = expected.replaceAll("^['\"]|['\"]$", "");
                    passed = actual.equals(expectedClean) || actual.equals(expected);
                } catch (Exception e) {
                    actual = "Error: " + e.getMessage();
                    passed = false;
                }
            } else {
                actual = "Not executed (language not supported for in-browser evaluation)";
                passed = false;
            }

            long runtimeMs = (System.nanoTime() - startTime) / 1_000_000;
            results.add(new RunCodeResponse.TestCaseResult(input, expected, actual, passed, runtimeMs));
        }

        return results;
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
        question.setHiddenTestCases(req.hiddenTestCases());
        question.setCreatedBy(createdBy);
        question.setStatus("draft");
        if (req.negativeMarks() != null) {
            question.setNegativeMarks(req.negativeMarks());
        }
        if (req.randomizePool() != null) {
            question.setRandomizePool(req.randomizePool());
        }
        question = questionRepo.save(question);
        return toQuestionResponse(question);
    }

    public List<QuestionResponse> listQuestions(UUID orgId, String type) {
        if (orgId == null) {
            return List.of();
        }
        if (type != null && !type.isEmpty()) {
            return questionRepo.findByOrgIdAndTypeOrderByCreatedAtDesc(orgId, type).stream()
                    .map(this::toQuestionResponse)
                    .collect(Collectors.toList());
        }
        return questionRepo.findByOrgIdOrderByCreatedAtDesc(orgId).stream()
                .map(this::toQuestionResponse)
                .collect(Collectors.toList());
    }

    public QuestionResponse publishQuestion(UUID questionId) {
        Question question = questionRepo.findById(questionId)
                .orElseThrow(() -> new ApiException("QUESTION_NOT_FOUND", HttpStatus.NOT_FOUND, "Question not found"));
        if (!"approved".equals(question.getStatus())) {
            throw new ApiException("QUESTION_NOT_APPROVED", HttpStatus.BAD_REQUEST, "Question must be approved before publishing");
        }
        question.setStatus("published");
        question.setUpdatedAt(Instant.now());
        questionRepo.save(question);
        return toQuestionResponse(question);
    }

    public QuestionResponse submitForReview(UUID questionId) {
        Question question = questionRepo.findById(questionId)
                .orElseThrow(() -> new ApiException("QUESTION_NOT_FOUND", HttpStatus.NOT_FOUND, "Question not found"));
        if (!"draft".equals(question.getStatus()) && !"rejected".equals(question.getStatus())) {
            throw new ApiException("INVALID_TRANSITION", HttpStatus.BAD_REQUEST, "Only draft or rejected questions can be submitted for review");
        }
        question.setStatus("review");
        question.setUpdatedAt(Instant.now());
        questionRepo.save(question);
        return toQuestionResponse(question);
    }

    public QuestionResponse approveQuestion(UUID questionId) {
        Question question = questionRepo.findById(questionId)
                .orElseThrow(() -> new ApiException("QUESTION_NOT_FOUND", HttpStatus.NOT_FOUND, "Question not found"));
        if (!"review".equals(question.getStatus())) {
            throw new ApiException("INVALID_TRANSITION", HttpStatus.BAD_REQUEST, "Only questions in review can be approved");
        }
        question.setStatus("approved");
        question.setUpdatedAt(Instant.now());
        questionRepo.save(question);
        return toQuestionResponse(question);
    }

    public QuestionResponse rejectQuestion(UUID questionId) {
        Question question = questionRepo.findById(questionId)
                .orElseThrow(() -> new ApiException("QUESTION_NOT_FOUND", HttpStatus.NOT_FOUND, "Question not found"));
        if (!"review".equals(question.getStatus())) {
            throw new ApiException("INVALID_TRANSITION", HttpStatus.BAD_REQUEST, "Only questions in review can be rejected");
        }
        question.setStatus("rejected");
        question.setUpdatedAt(Instant.now());
        questionRepo.save(question);
        return toQuestionResponse(question);
    }

    public List<QuestionResponse> listQuestionsByStatus(UUID orgId, String status) {
        return questionRepo.findByOrgIdAndStatusOrderByCreatedAtDesc(orgId, status).stream()
                .map(this::toQuestionResponse)
                .collect(Collectors.toList());
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
        java.math.BigDecimal aptitudePenalty = java.math.BigDecimal.ZERO;
        java.math.BigDecimal reasoningPenalty = java.math.BigDecimal.ZERO;

        for (SectionResponse sr : responses) {
            Question q = questionRepo.findById(sr.getQuestionId()).orElse(null);
            if (q == null) continue;
            if ("aptitude".equals(q.getType())) {
                aptitudeTotal++;
                if (Boolean.TRUE.equals(sr.getIsCorrect())) {
                    aptitudeCorrect++;
                } else if (sr.getSelectedOption() != null && q.getNegativeMarks() != null) {
                    aptitudePenalty = aptitudePenalty.add(q.getNegativeMarks());
                }
            } else if ("reasoning".equals(q.getType())) {
                reasoningTotal++;
                if (Boolean.TRUE.equals(sr.getIsCorrect())) {
                    reasoningCorrect++;
                } else if (sr.getSelectedOption() != null && q.getNegativeMarks() != null) {
                    reasoningPenalty = reasoningPenalty.add(q.getNegativeMarks());
                }
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

    public PageResponse<SessionReportResponse> listSessionsPaged(UUID orgId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<AssessmentSession> p = sessionRepo.findByOrgIdOrderByCreatedAtDesc(orgId, pageable);
        List<SessionReportResponse> content = p.getContent().stream()
                .map(s -> getSessionReport(s.getId()))
                .collect(Collectors.toList());
        return PageResponse.of(content, page, size, p.getTotalElements());
    }

    // ─── Auto-save / Resume ───

    public void autoSaveSession(UUID sessionId, AutoSaveRequest req) {
        SessionDraft draft = sessionDraftRepo.findBySessionId(sessionId).orElseGet(() -> {
            SessionDraft d = new SessionDraft();
            d.setSessionId(sessionId);
            return d;
        });
        draft.setCurrentSection(req.currentSection());
        draft.setCurrentQuestionIndex(req.currentQuestionIndex());
        draft.setCode(req.code());
        draft.setLanguage(req.language());
        try {
            draft.setAnswersJson(req.answers() != null
                    ? new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(req.answers())
                    : null);
        } catch (Exception e) {
            draft.setAnswersJson(null);
        }
        draft.setSavedAt(Instant.now());
        sessionDraftRepo.save(draft);
    }

    public AutoSaveResponse getAutoSave(UUID sessionId) {
        return sessionDraftRepo.findBySessionId(sessionId)
                .map(draft -> {
                    java.util.Map<String, String> answers = null;
                    if (draft.getAnswersJson() != null) {
                        try {
                            answers = new com.fasterxml.jackson.databind.ObjectMapper()
                                    .readValue(draft.getAnswersJson(),
                                            new com.fasterxml.jackson.core.type.TypeReference<java.util.Map<String, String>>() {});
                        } catch (Exception e) {
                            answers = null;
                        }
                    }
                    return new AutoSaveResponse(
                            draft.getCurrentSection(),
                            draft.getCurrentQuestionIndex(),
                            draft.getCode(),
                            draft.getLanguage(),
                            answers,
                            draft.getSavedAt()
                    );
                })
                .orElse(null);
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
                q.getTestCases(), q.getHiddenTestCases(), q.getStatus(), q.getVersion(), q.getCreatedAt(),
                q.getNegativeMarks(), q.isRandomizePool());
    }

    // ─── Assessment Configuration (FR-ASMT-09, A.19.5) ───

    public Assessment createAssessment(UUID orgId, UUID createdBy, CreateAssessmentRequest req) {
        Assessment assessment = new Assessment();
        assessment.setOrgId(orgId);
        assessment.setTemplateId(req.templateId());
        assessment.setName(req.name());
        assessment.setScoringConfig(req.scoringConfig() != null ? req.scoringConfig() :
                "{\"passThreshold\": 60, \"negativeMarking\": false}");
        assessment.setProctoringLevel(req.proctoringLevel() != null ? req.proctoringLevel() : "standard");
        assessment.setCreatedBy(createdBy);
        return assessmentRepo.save(assessment);
    }

    public List<Assessment> listAssessments(UUID orgId) {
        return assessmentRepo.findByOrgId(orgId);
    }

    public Assessment lockAssessment(UUID id) {
        Assessment assessment = assessmentRepo.findById(id)
                .orElseThrow(() -> new ApiException("NOT_FOUND", HttpStatus.NOT_FOUND, "Assessment not found"));
        if (assessment.isLocked()) {
            throw new ApiException("ALREADY_LOCKED", HttpStatus.CONFLICT, "Assessment is already locked");
        }
        assessment.setLockedAt(Instant.now());
        assessment.setUpdatedAt(Instant.now());
        return assessmentRepo.save(assessment);
    }

    // ─── Test Cases (FR-ASMT-07: weighted, partial scoring) ───

    public TestCase addTestCase(UUID questionId, CreateTestCaseRequest req) {
        TestCase tc = new TestCase();
        tc.setQuestionId(questionId);
        tc.setInput(req.input());
        tc.setExpectedOutput(req.expectedOutput());
        tc.setHidden(req.isHidden());
        tc.setWeight(req.weight() != null ? req.weight() : java.math.BigDecimal.ONE);
        return testCaseRepo.save(tc);
    }

    public List<TestCase> getTestCases(UUID questionId, boolean includeHidden) {
        if (includeHidden) {
            return testCaseRepo.findByQuestionId(questionId);
        }
        return testCaseRepo.findByQuestionIdAndHidden(questionId, false);
    }

    // ─── GDPR: Right to Erasure ───

    public void softDeleteApplicant(UUID applicantId) {
        Applicant applicant = applicantRepo.findById(applicantId)
                .orElseThrow(() -> new ApiException("NOT_FOUND", HttpStatus.NOT_FOUND, "Applicant not found"));
        applicant.setDeletedAt(Instant.now());
        applicantRepo.save(applicant);
    }

    // ─── Assessment Questions (D.4.4: attach question with weight) ───

    public AssessmentQuestion attachQuestion(UUID assessmentId, AttachQuestionRequest req) {
        Assessment assessment = assessmentRepo.findById(assessmentId)
                .orElseThrow(() -> new ApiException("NOT_FOUND", HttpStatus.NOT_FOUND, "Assessment not found"));
        if (assessment.isLocked()) {
            throw new ApiException("ASSESSMENT_LOCKED", HttpStatus.CONFLICT, "Cannot modify a locked assessment");
        }
        if (assessmentQuestionRepo.existsByAssessmentIdAndQuestionId(assessmentId, req.questionId())) {
            throw new ApiException("DUPLICATE", HttpStatus.CONFLICT, "Question already attached to this assessment");
        }
        AssessmentQuestion aq = new AssessmentQuestion();
        aq.setAssessmentId(assessmentId);
        aq.setQuestionId(req.questionId());
        aq.setWeight(req.weight() != null ? req.weight() : java.math.BigDecimal.ONE);
        aq.setDisplayOrder(req.displayOrder() != null ? req.displayOrder() : 0);
        return assessmentQuestionRepo.save(aq);
    }

    public List<AssessmentQuestion> listAssessmentQuestions(UUID assessmentId) {
        return assessmentQuestionRepo.findByAssessmentIdOrderByDisplayOrder(assessmentId);
    }

    // ─── Bulk Invite (D.4.4: bulk invite candidates) ───

    public BulkInviteResponse bulkInvite(UUID orgId, UUID createdBy, UUID assessmentId, BulkInviteRequest req) {
        Assessment assessment = assessmentRepo.findById(assessmentId)
                .orElseThrow(() -> new ApiException("NOT_FOUND", HttpStatus.NOT_FOUND, "Assessment not found"));
        List<String> tokens = new java.util.ArrayList<>();
        List<String> errors = new java.util.ArrayList<>();
        int invited = 0;
        for (BulkInviteRequest.CandidateInvite c : req.candidates()) {
            try {
                Applicant applicant = new Applicant();
                applicant.setOrgId(orgId);
                applicant.setName(c.name());
                applicant.setEmail(c.email());
                applicant.setStatus("invited");
                applicant = applicantRepo.save(applicant);

                AssessmentLink link = new AssessmentLink();
                link.setApplicantId(applicant.getId());
                link.setTemplateId(assessment.getTemplateId());
                link.setOrgId(orgId);
                link.setToken(UUID.randomUUID().toString().replace("-", ""));
                link.setStatus("pending");
                link.setExpiresAt(Instant.now().plus(java.time.Duration.ofDays(7)));
                link.setCreatedBy(createdBy);
                linkRepo.save(link);

                tokens.add(link.getToken());
                invited++;
            } catch (Exception e) {
                errors.add(c.email() + ": " + e.getMessage());
            }
        }
        return new BulkInviteResponse(invited, tokens, errors);
    }

    // ─── Question Version History (FR-AUTH-Q-04) ───

    public List<QuestionVersionHistory> getQuestionVersionHistory(UUID questionId) {
        return questionVersionHistoryRepo.findByQuestionIdOrderByVersionDesc(questionId);
    }

    public QuestionVersionHistory getVersionDiff(UUID questionId, int version1, int version2) {
        List<QuestionVersionHistory> history = questionVersionHistoryRepo.findByQuestionIdOrderByVersionDesc(questionId);
        return history.stream()
                .filter(h -> h.getVersion() == version1 || h.getVersion() == version2)
                .reduce((a, b) -> a.getVersion() == version1 ? a : b)
                .orElseThrow(() -> new ApiException("VERSION_NOT_FOUND", HttpStatus.NOT_FOUND, "Version not found"));
    }

    private void saveVersionSnapshot(Question question, UUID changedBy, String summary) {
        QuestionVersionHistory snapshot = new QuestionVersionHistory();
        snapshot.setQuestionId(question.getId());
        snapshot.setOrgId(question.getOrgId());
        snapshot.setVersion(question.getVersion());
        snapshot.setBody(question.getBody());
        snapshot.setOptionA(question.getOptionA());
        snapshot.setOptionB(question.getOptionB());
        snapshot.setOptionC(question.getOptionC());
        snapshot.setOptionD(question.getOptionD());
        snapshot.setCorrectOption(question.getCorrectOption());
        snapshot.setDifficulty(question.getDifficulty());
        snapshot.setTestCases(question.getTestCases());
        snapshot.setHiddenTestCases(question.getHiddenTestCases());
        snapshot.setChangedBy(changedBy);
        snapshot.setChangeSummary(summary);
        questionVersionHistoryRepo.save(snapshot);
    }

    public QuestionResponse updateQuestion(UUID questionId, UUID updatedBy, CreateQuestionRequest req) {
        Question question = questionRepo.findById(questionId)
                .orElseThrow(() -> new ApiException("QUESTION_NOT_FOUND", HttpStatus.NOT_FOUND, "Question not found"));

        saveVersionSnapshot(question, updatedBy, "Update before version " + (question.getVersion() + 1));

        question.setBody(req.body());
        question.setOptionA(req.optionA());
        question.setOptionB(req.optionB());
        question.setOptionC(req.optionC());
        question.setOptionD(req.optionD());
        question.setCorrectOption(req.correctOption());
        if (req.difficulty() != null) question.setDifficulty(req.difficulty());
        question.setTags(req.tags());
        question.setTestCases(req.testCases());
        question.setHiddenTestCases(req.hiddenTestCases());
        if (req.negativeMarks() != null) question.setNegativeMarks(req.negativeMarks());
        if (req.randomizePool() != null) question.setRandomizePool(req.randomizePool());
        question.setVersion(question.getVersion() + 1);
        question.setUpdatedAt(Instant.now());
        question = questionRepo.save(question);
        return toQuestionResponse(question);
    }

    // ─── Bulk Import/Export Questions (FR-AUTH-Q-06) ───

    private static final int BULK_IMPORT_MAX = 500;

    public List<QuestionResponse> bulkImportQuestions(UUID orgId, UUID createdBy, List<CreateQuestionRequest> requests) {
        if (requests == null || requests.isEmpty()) {
            throw new ApiException("BULK_IMPORT_EMPTY", HttpStatus.BAD_REQUEST,
                    "No questions provided for import");
        }
        if (requests.size() > BULK_IMPORT_MAX) {
            throw new ApiException("BULK_IMPORT_TOO_LARGE", HttpStatus.BAD_REQUEST,
                    "Bulk import limited to " + BULK_IMPORT_MAX + " questions per request, received " + requests.size());
        }
        List<QuestionResponse> results = new java.util.ArrayList<>();
        for (CreateQuestionRequest req : requests) {
            try {
                results.add(createQuestion(orgId, createdBy, req));
            } catch (Exception e) {
                throw new ApiException("BULK_IMPORT_FAILED", HttpStatus.BAD_REQUEST,
                        "Failed to import question: " + e.getMessage());
            }
        }
        return results;
    }

    public String exportQuestionsToCsv(UUID orgId) {
        List<Question> questions = questionRepo.findByOrgIdOrderByCreatedAtDesc(orgId);
        StringBuilder sb = new StringBuilder();
        sb.append("id,type,body,difficulty,tags,status,version,negativeMarks,randomizePool,createdAt\n");
        for (Question q : questions) {
            sb.append(q.getId()).append(",")
              .append(escapeCsv(q.getType())).append(",")
              .append(escapeCsv(q.getBody())).append(",")
              .append(escapeCsv(q.getDifficulty())).append(",")
              .append(escapeCsv(q.getTags())).append(",")
              .append(q.getStatus()).append(",")
              .append(q.getVersion()).append(",")
              .append(q.getNegativeMarks()).append(",")
              .append(q.isRandomizePool()).append(",")
              .append(q.getCreatedAt()).append("\n");
        }
        return sb.toString();
    }

    private String escapeCsv(String value) {
        if (value == null) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n") || value.contains("\r")) {
            return "\"" + value.replace("\"", "\"\"").replace("\r\n", " ").replace("\n", " ").replace("\r", " ") + "\"";
        }
        return value;
    }

    // ─── Runtime Metrics Per Test Case (FR-EDIT-05) ───

    public RunCodeResponse runCodeWithMetrics(UUID sessionId, SubmitCodeRequest req) {
        Question question = questionRepo.findById(req.questionId())
                .orElseThrow(() -> new ApiException("QUESTION_NOT_FOUND", HttpStatus.NOT_FOUND, "Question not found"));

        List<RunCodeResponse.TestCaseResult> visibleResults = parseAndEvaluateWithMetrics(
                question.getTestCases(), req.code(), req.language());
        List<RunCodeResponse.TestCaseResult> hiddenResults = parseAndEvaluateWithMetrics(
                question.getHiddenTestCases(), req.code(), req.language());

        int visiblePassed = (int) visibleResults.stream().filter(RunCodeResponse.TestCaseResult::passed).count();
        int hiddenPassed = (int) hiddenResults.stream().filter(RunCodeResponse.TestCaseResult::passed).count();

        return new RunCodeResponse(
                visiblePassed, visibleResults.size(),
                hiddenPassed, hiddenResults.size(),
                visibleResults, hiddenResults,
                visiblePassed == visibleResults.size() && !visibleResults.isEmpty(),
                hiddenPassed == hiddenResults.size() && !hiddenResults.isEmpty()
        );
    }

    private List<RunCodeResponse.TestCaseResult> parseAndEvaluateWithMetrics(String testCasesStr, String code, String language) {
        if (testCasesStr == null || testCasesStr.isBlank()) {
            return List.of();
        }
        List<RunCodeResponse.TestCaseResult> results = new java.util.ArrayList<>();
        javax.script.ScriptEngine engine = null;
        if ("javascript".equalsIgnoreCase(language)) {
            javax.script.ScriptEngineManager manager = new javax.script.ScriptEngineManager();
            engine = manager.getEngineByName("javascript");
        }

        for (String line : testCasesStr.split("\n")) {
            line = line.trim();
            if (line.isEmpty() || line.startsWith("#")) continue;

            String input = null;
            String expected = null;

            int arrowIdx = line.indexOf("=>");
            if (arrowIdx >= 0) {
                String before = line.substring(0, arrowIdx).trim();
                String after = line.substring(arrowIdx + 2).trim();
                int inputIdx = before.toLowerCase().indexOf("input:");
                input = inputIdx >= 0 ? before.substring(inputIdx + 6).trim() : before;
                int outputIdx = after.toLowerCase().indexOf("output:");
                expected = outputIdx >= 0 ? after.substring(outputIdx + 7).trim() : after;
            }

            if (input == null || expected == null) continue;

            String actual = "";
            boolean passed = false;
            long startTime = System.nanoTime();

            if (engine != null) {
                try {
                    engine.eval(code);
                    Object result = engine.eval("solution(" + input + ")");
                    actual = result != null ? result.toString() : "null";
                    String expectedClean = expected.replaceAll("^['\"]|['\"]$", "");
                    passed = actual.equals(expectedClean) || actual.equals(expected);
                } catch (Exception e) {
                    actual = "Error: " + e.getMessage();
                    passed = false;
                }
            } else {
                actual = "Not executed (language not supported for in-browser evaluation)";
                passed = false;
            }

            long runtimeMs = (System.nanoTime() - startTime) / 1_000_000;
            results.add(new RunCodeResponse.TestCaseResult(input, expected, actual, passed, runtimeMs));
        }
        return results;
    }

    // ─── Question Bank Import Mapping (H.9) ───

    public List<QuestionResponse> importMappedQuestions(UUID orgId, UUID createdBy, String format, String rawJson) {
        QuestionBankImportMapper.SourceFormat sourceFormat;
        try {
            sourceFormat = QuestionBankImportMapper.SourceFormat.valueOf(format.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ApiException("INVALID_FORMAT", HttpStatus.BAD_REQUEST,
                    "Unsupported import format: " + format + ". Supported: HACKERRANK, CODESIGNAL, CODILITY, METTL, GENERIC_JSON");
        }
        List<CreateQuestionRequest> mapped = importMapper.map(rawJson, sourceFormat);
        return bulkImportQuestions(orgId, createdBy, mapped);
    }

    // ─── Accommodation Support (H.5) ───

    public AssessmentSession configureAccommodation(UUID sessionId, UUID approvedBy,
                                                     AssessmentController.AccommodationRequest req) {
        AssessmentSession session = sessionRepo.findById(sessionId)
                .orElseThrow(() -> new ApiException("SESSION_NOT_FOUND", HttpStatus.NOT_FOUND, "Session not found"));

        if ("submitted".equals(session.getStatus()) || session.getStatus().startsWith("terminated")) {
            throw new ApiException("SESSION_LOCKED", HttpStatus.BAD_REQUEST, "Cannot configure accommodation on a locked session");
        }

        if (req.timeMultiplier() != null) {
            if (req.timeMultiplier() < 1.0 || req.timeMultiplier() > 3.0) {
                throw new ApiException("INVALID_TIME_MULTIPLIER", HttpStatus.BAD_REQUEST,
                        "Time multiplier must be between 1.0 and 3.0");
            }
            session.setTimeMultiplier(req.timeMultiplier());
        }

        if (req.proctoringLevelOverride() != null && !req.proctoringLevelOverride().isBlank()) {
            String level = req.proctoringLevelOverride().toLowerCase();
            if (!level.equals("none") && !level.equals("light") && !level.equals("standard") && !level.equals("strict")) {
                throw new ApiException("INVALID_PROCTORING_LEVEL", HttpStatus.BAD_REQUEST,
                        "Proctoring level must be one of: none, light, standard, strict");
            }
            session.setProctoringLevelOverride(level);
        }

        session.setAccommodationNotes(req.notes());
        session.setAccommodationApprovedBy(approvedBy);
        session.setAccommodationGrantedAt(Instant.now());
        return sessionRepo.save(session);
    }

    // ─── Pre-Assessment Device-Class Check (FR-SEC-ENV-08, H.8) ───

    public AssessmentController.DeviceCheckResponse performDeviceCheck(UUID sessionId, String userAgent) {
        sessionRepo.findById(sessionId)
                .orElseThrow(() -> new ApiException("SESSION_NOT_FOUND", HttpStatus.NOT_FOUND, "Session not found"));

        String ua = userAgent.toLowerCase();
        String deviceClass;
        boolean allowed;

        if (ua.contains("mobile") || ua.contains("android") && !ua.contains("tablet") || ua.contains("iphone")) {
            deviceClass = "mobile";
            allowed = false;
        } else if (ua.contains("ipad") || ua.contains("tablet") || ua.contains("android")) {
            deviceClass = "tablet";
            allowed = false;
        } else {
            deviceClass = "desktop";
            allowed = true;
        }

        String message = allowed
                ? "Device supported. You may proceed with the assessment."
                : "Assessments require a desktop or laptop computer. Please switch to a supported device to continue.";

        return new AssessmentController.DeviceCheckResponse(allowed, deviceClass, message);
    }

    // ─── Age-Gate & Biometric Consent (H.6) ───

    public AssessmentController.ConsentResponse recordConsent(UUID sessionId,
                                                               AssessmentController.ConsentRequest req) {
        AssessmentSession session = sessionRepo.findById(sessionId)
                .orElseThrow(() -> new ApiException("SESSION_NOT_FOUND", HttpStatus.NOT_FOUND, "Session not found"));

        if (!req.biometricConsent()) {
            return new AssessmentController.ConsentResponse(false, false,
                    "Biometric consent is required to proceed with proctored assessment.");
        }

        boolean guardianRequired = req.ageDeclared() != null && req.ageDeclared() < 18;

        if (guardianRequired && !req.guardianConsent()) {
            return new AssessmentController.ConsentResponse(false, true,
                    "Parental/guardian consent is required for candidates under 18 before biometric capture.");
        }

        ProctoringEvent consentEvent = new ProctoringEvent();
        consentEvent.setSessionId(sessionId);
        consentEvent.setEventType("consent_recorded");
        consentEvent.setWarningNumber(0);
        consentEvent.setDetail(guardianRequired
                ? "Biometric consent + guardian consent recorded (age: " + req.ageDeclared() + ")"
                : "Biometric consent recorded");
        proctoringEventRepo.save(consentEvent);

        return new AssessmentController.ConsentResponse(true, guardianRequired,
                guardianRequired ? "Consent recorded with guardian approval." : "Consent recorded.");
    }
}
