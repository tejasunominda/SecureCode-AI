package ai.securecode.assessment.controller;

import ai.securecode.assessment.dto.*;
import ai.securecode.assessment.entity.AssessmentSession;
import ai.securecode.assessment.entity.CodingSubmission;
import ai.securecode.assessment.entity.ProctoringEvent;
import ai.securecode.assessment.entity.SectionResponse;
import ai.securecode.assessment.service.AssessmentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/assessment")
public class AssessmentController {

    private final AssessmentService service;

    public AssessmentController(AssessmentService service) {
        this.service = service;
    }

    // ─── HR: Applicant Management ───

    @PostMapping("/applicants")
    public ResponseEntity<ApplicantResponse> createApplicant(
            @RequestHeader("X-Org-Id") UUID orgId,
            @Valid @RequestBody CreateApplicantRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createApplicant(orgId, req));
    }

    @GetMapping("/applicants")
    public ResponseEntity<List<ApplicantResponse>> listApplicants(
            @RequestHeader("X-Org-Id") UUID orgId) {
        return ResponseEntity.ok(service.listApplicants(orgId));
    }

    @PutMapping("/applicants/{id}/shortlist")
    public ResponseEntity<ApplicantResponse> shortlistApplicant(@PathVariable UUID id) {
        return ResponseEntity.ok(service.shortlistApplicant(id));
    }

    @PutMapping("/applicants/{id}/reject")
    public ResponseEntity<ApplicantResponse> rejectApplicant(@PathVariable UUID id) {
        return ResponseEntity.ok(service.rejectApplicant(id));
    }

    // ─── HR: Generate Assessment Link ───

    @PostMapping("/links/generate")
    public ResponseEntity<AssessmentLinkResponse> generateLink(
            @RequestHeader("X-Org-Id") UUID orgId,
            @RequestHeader("X-User-Id") UUID createdBy,
            @Valid @RequestBody GenerateLinkRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.generateLink(orgId, createdBy, req));
    }

    // ─── Candidate: Start Test via Link (public) ───

    @PostMapping("/candidate/start/{token}")
    public ResponseEntity<AssessmentSession> startTest(@PathVariable String token) {
        return ResponseEntity.ok(service.startTestByToken(token));
    }

    // ─── Candidate: Submit MCQ Answer ───

    @PostMapping("/sessions/{sessionId}/answer")
    public ResponseEntity<SectionResponse> submitAnswer(
            @PathVariable UUID sessionId,
            @Valid @RequestBody SubmitAnswerRequest req) {
        return ResponseEntity.ok(service.submitAnswer(sessionId, req));
    }

    // ─── Candidate: Submit Code ───

    @PostMapping("/sessions/{sessionId}/code")
    public ResponseEntity<CodingSubmission> submitCode(
            @PathVariable UUID sessionId,
            @Valid @RequestBody SubmitCodeRequest req) {
        return ResponseEntity.ok(service.submitCode(sessionId, req));
    }

    // ─── Candidate: Submit/Finish Test ───

    @PostMapping("/sessions/{sessionId}/submit")
    public ResponseEntity<AssessmentSession> submitTest(@PathVariable UUID sessionId) {
        return ResponseEntity.ok(service.submitTest(sessionId));
    }

    // ─── Proctoring Events ───

    @PostMapping("/sessions/{sessionId}/proctoring")
    public ResponseEntity<ProctoringEvent> recordProctoringEvent(
            @PathVariable UUID sessionId,
            @RequestParam String eventType) {
        return ResponseEntity.ok(service.recordProctoringEvent(sessionId, eventType));
    }

    // ─── HR/Technical Manager: Question Bank ───

    @PostMapping("/questions")
    public ResponseEntity<QuestionResponse> createQuestion(
            @RequestHeader("X-Org-Id") UUID orgId,
            @RequestHeader("X-User-Id") UUID createdBy,
            @Valid @RequestBody CreateQuestionRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createQuestion(orgId, createdBy, req));
    }

    @GetMapping("/questions")
    public ResponseEntity<List<QuestionResponse>> listQuestions(
            @RequestHeader("X-Org-Id") UUID orgId,
            @RequestParam(required = false) String type) {
        return ResponseEntity.ok(service.listQuestions(orgId, type));
    }

    @PutMapping("/questions/{id}/publish")
    public ResponseEntity<QuestionResponse> publishQuestion(@PathVariable UUID id) {
        return ResponseEntity.ok(service.publishQuestion(id));
    }

    // ─── HR: Hiring Decision ───

    @PostMapping("/sessions/{sessionId}/decision")
    public ResponseEntity<?> makeHiringDecision(
            @PathVariable UUID sessionId,
            @RequestHeader("X-User-Id") UUID decidedBy,
            @Valid @RequestBody HiringDecisionRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.makeHiringDecision(sessionId, decidedBy, req));
    }

    // ─── HR/Technical Manager: Reports ───

    @GetMapping("/sessions/{sessionId}/report")
    public ResponseEntity<SessionReportResponse> getSessionReport(@PathVariable UUID sessionId) {
        return ResponseEntity.ok(service.getSessionReport(sessionId));
    }

    @GetMapping("/sessions")
    public ResponseEntity<List<SessionReportResponse>> listSessions(
            @RequestHeader("X-Org-Id") UUID orgId) {
        return ResponseEntity.ok(service.listSessions(orgId));
    }
}
