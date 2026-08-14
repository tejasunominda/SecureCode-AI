package ai.securecode.assessment.controller;

import ai.securecode.assessment.dto.*;
import ai.securecode.assessment.entity.AssessmentSession;
import ai.securecode.assessment.entity.CodingSubmission;
import ai.securecode.assessment.entity.ProctoringEvent;
import ai.securecode.assessment.entity.SectionResponse;
import ai.securecode.assessment.service.AssessmentService;
import ai.securecode.common.dto.PageResponse;
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

    @GetMapping("/applicants/paged")
    public ResponseEntity<PageResponse<ApplicantResponse>> listApplicantsPaged(
            @RequestHeader("X-Org-Id") UUID orgId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.listApplicantsPaged(orgId, page, size));
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

    // ─── Candidate: Validate Link (public) ───

    @GetMapping("/candidate/validate/{token}")
    public ResponseEntity<Void> validateLink(@PathVariable String token) {
        service.validateLink(token);
        return ResponseEntity.ok().build();
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

    @PostMapping("/sessions/{sessionId}/code/run")
    public ResponseEntity<RunCodeResponse> runCode(
            @PathVariable UUID sessionId,
            @Valid @RequestBody SubmitCodeRequest req) {
        return ResponseEntity.ok(service.runCode(sessionId, req));
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

    @PostMapping("/sessions/{sessionId}/proctoring/detailed")
    public ResponseEntity<ProctoringEvent> recordDetailedProctoringEvent(
            @PathVariable UUID sessionId,
            @RequestBody ProctoringEventRequest req) {
        return ResponseEntity.ok(service.recordProctoringEvent(
                sessionId, req.eventType(), req.screenshotData(), req.audioData(), req.detail()));
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
            @RequestHeader(value = "X-Org-Id", required = false) UUID orgId,
            @RequestParam(required = false) String type) {
        return ResponseEntity.ok(service.listQuestions(orgId, type));
    }

    @PutMapping("/questions/{id}/publish")
    public ResponseEntity<QuestionResponse> publishQuestion(@PathVariable UUID id) {
        return ResponseEntity.ok(service.publishQuestion(id));
    }

    @PutMapping("/questions/{id}/submit-review")
    public ResponseEntity<QuestionResponse> submitForReview(@PathVariable UUID id) {
        return ResponseEntity.ok(service.submitForReview(id));
    }

    @PutMapping("/questions/{id}/approve")
    public ResponseEntity<QuestionResponse> approveQuestion(@PathVariable UUID id) {
        return ResponseEntity.ok(service.approveQuestion(id));
    }

    @PutMapping("/questions/{id}/reject")
    public ResponseEntity<QuestionResponse> rejectQuestion(@PathVariable UUID id) {
        return ResponseEntity.ok(service.rejectQuestion(id));
    }

    @GetMapping("/questions/by-status")
    public ResponseEntity<List<QuestionResponse>> listQuestionsByStatus(
            @RequestHeader("X-Org-Id") UUID orgId,
            @RequestParam String status) {
        return ResponseEntity.ok(service.listQuestionsByStatus(orgId, status));
    }

    // ─── Auto-save / Resume ───

    @PostMapping("/sessions/{sessionId}/autosave")
    public ResponseEntity<Void> autoSave(
            @PathVariable UUID sessionId,
            @RequestBody AutoSaveRequest req) {
        service.autoSaveSession(sessionId, req);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/sessions/{sessionId}/autosave")
    public ResponseEntity<AutoSaveResponse> getAutoSave(@PathVariable UUID sessionId) {
        return ResponseEntity.ok(service.getAutoSave(sessionId));
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

    @GetMapping("/sessions/paged")
    public ResponseEntity<PageResponse<SessionReportResponse>> listSessionsPaged(
            @RequestHeader("X-Org-Id") UUID orgId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.listSessionsPaged(orgId, page, size));
    }

    // ─── Assessment Configuration (FR-ASMT-09, A.19.5) ───

    @PostMapping("/assessments")
    public ResponseEntity<ai.securecode.assessment.entity.Assessment> createAssessment(
            @RequestHeader("X-Org-Id") UUID orgId,
            @RequestHeader("X-User-Id") UUID createdBy,
            @RequestBody CreateAssessmentRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.createAssessment(orgId, createdBy, req));
    }

    @GetMapping("/assessments")
    public ResponseEntity<List<ai.securecode.assessment.entity.Assessment>> listAssessments(
            @RequestHeader("X-Org-Id") UUID orgId) {
        return ResponseEntity.ok(service.listAssessments(orgId));
    }

    @PutMapping("/assessments/{id}/lock")
    public ResponseEntity<ai.securecode.assessment.entity.Assessment> lockAssessment(@PathVariable UUID id) {
        return ResponseEntity.ok(service.lockAssessment(id));
    }

    // ─── Test Cases (FR-ASMT-07: weighted, partial scoring) ───

    @PostMapping("/questions/{questionId}/test-cases")
    public ResponseEntity<ai.securecode.assessment.entity.TestCase> addTestCase(
            @PathVariable UUID questionId,
            @RequestBody CreateTestCaseRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.addTestCase(questionId, req));
    }

    @GetMapping("/questions/{questionId}/test-cases")
    public ResponseEntity<List<ai.securecode.assessment.entity.TestCase>> getTestCases(
            @PathVariable UUID questionId,
            @RequestParam(defaultValue = "false") boolean includeHidden) {
        return ResponseEntity.ok(service.getTestCases(questionId, includeHidden));
    }

    // ─── GDPR: Right to Erasure ───

    @DeleteMapping("/applicants/{id}")
    public ResponseEntity<Void> deleteApplicant(@PathVariable UUID id) {
        service.softDeleteApplicant(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Assessment Questions (D.4.4: attach question with weight) ───

    @PostMapping("/assessments/{id}/questions")
    public ResponseEntity<ai.securecode.assessment.entity.AssessmentQuestion> attachQuestion(
            @PathVariable UUID id,
            @Valid @RequestBody AttachQuestionRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.attachQuestion(id, req));
    }

    @GetMapping("/assessments/{id}/questions")
    public ResponseEntity<List<ai.securecode.assessment.entity.AssessmentQuestion>> listAssessmentQuestions(
            @PathVariable UUID id) {
        return ResponseEntity.ok(service.listAssessmentQuestions(id));
    }

    // ─── Bulk Invite (D.4.4: bulk invite candidates) ───

    @PostMapping("/assessments/{id}/invite")
    public ResponseEntity<BulkInviteResponse> bulkInvite(
            @RequestHeader("X-Org-Id") UUID orgId,
            @RequestHeader("X-User-Id") UUID createdBy,
            @PathVariable UUID id,
            @Valid @RequestBody BulkInviteRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.bulkInvite(orgId, createdBy, id, req));
    }

    // ─── Question Version History (FR-AUTH-Q-04) ───

    @GetMapping("/questions/{id}/versions")
    public ResponseEntity<List<ai.securecode.assessment.entity.QuestionVersionHistory>> getQuestionVersions(
            @PathVariable UUID id) {
        return ResponseEntity.ok(service.getQuestionVersionHistory(id));
    }

    @GetMapping("/questions/{id}/versions/diff")
    public ResponseEntity<ai.securecode.assessment.entity.QuestionVersionHistory> getVersionDiff(
            @PathVariable UUID id,
            @RequestParam int v1,
            @RequestParam int v2) {
        return ResponseEntity.ok(service.getVersionDiff(id, v1, v2));
    }

    @PutMapping("/questions/{id}")
    public ResponseEntity<QuestionResponse> updateQuestion(
            @RequestHeader("X-User-Id") UUID updatedBy,
            @PathVariable UUID id,
            @Valid @RequestBody CreateQuestionRequest req) {
        return ResponseEntity.ok(service.updateQuestion(id, updatedBy, req));
    }

    // ─── Bulk Import/Export Questions (FR-AUTH-Q-06) ───

    @PostMapping("/questions/bulk-import")
    public ResponseEntity<List<QuestionResponse>> bulkImportQuestions(
            @RequestHeader("X-Org-Id") UUID orgId,
            @RequestHeader("X-User-Id") UUID createdBy,
            @Valid @RequestBody List<CreateQuestionRequest> requests) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.bulkImportQuestions(orgId, createdBy, requests));
    }

    @GetMapping("/questions/export")
    public ResponseEntity<String> exportQuestions(
            @RequestHeader("X-Org-Id") UUID orgId) {
        String csv = service.exportQuestionsToCsv(orgId);
        return ResponseEntity.ok()
                .header("Content-Type", "text/csv")
                .header("Content-Disposition", "attachment; filename=questions.csv")
                .body(csv);
    }

    // ─── Question Bank Import Mapping (H.9) ───

    @PostMapping("/questions/import-mapped")
    public ResponseEntity<List<QuestionResponse>> importMappedQuestions(
            @RequestHeader("X-Org-Id") UUID orgId,
            @RequestHeader("X-User-Id") UUID createdBy,
            @RequestParam String format,
            @RequestBody String rawJson) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.importMappedQuestions(orgId, createdBy, format, rawJson));
    }

    // ─── Runtime Metrics Per Test Case (FR-EDIT-05) ───

    @PostMapping("/sessions/{sessionId}/run-with-metrics")
    public ResponseEntity<RunCodeResponse> runCodeWithMetrics(
            @PathVariable UUID sessionId,
            @Valid @RequestBody SubmitCodeRequest req) {
        return ResponseEntity.ok(service.runCodeWithMetrics(sessionId, req));
    }

    // ─── Accommodation Support (H.5) ───

    @PutMapping("/sessions/{sessionId}/accommodation")
    public ResponseEntity<AssessmentSession> configureAccommodation(
            @RequestHeader("X-User-Id") UUID approvedBy,
            @PathVariable UUID sessionId,
            @Valid @RequestBody AccommodationRequest req) {
        return ResponseEntity.ok(service.configureAccommodation(sessionId, approvedBy, req));
    }

    // ─── Pre-Assessment Device-Class Check (FR-SEC-ENV-08, H.8) ───

    @GetMapping("/sessions/{sessionId}/device-check")
    public ResponseEntity<DeviceCheckResponse> deviceCheck(
            @PathVariable UUID sessionId,
            @RequestParam String userAgent) {
        return ResponseEntity.ok(service.performDeviceCheck(sessionId, userAgent));
    }

    // ─── Age-Gate & Biometric Consent (H.6) ───

    @PostMapping("/sessions/{sessionId}/consent")
    public ResponseEntity<ConsentResponse> recordConsent(
            @PathVariable UUID sessionId,
            @Valid @RequestBody ConsentRequest req) {
        return ResponseEntity.ok(service.recordConsent(sessionId, req));
    }

    public record AccommodationRequest(
            Double timeMultiplier,
            String proctoringLevelOverride,
            String notes
    ) {}

    public record DeviceCheckResponse(
            boolean allowed,
            String deviceClass,
            String message
    ) {}

    public record ConsentRequest(
            boolean biometricConsent,
            boolean guardianConsent,
            Integer ageDeclared
    ) {}

    public record ConsentResponse(
            boolean consentRecorded,
            boolean guardianConsentRequired,
            String message
    ) {}
}
