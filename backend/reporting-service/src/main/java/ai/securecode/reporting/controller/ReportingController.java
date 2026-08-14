package ai.securecode.reporting.controller;

import ai.securecode.reporting.dto.*;
import ai.securecode.reporting.entity.*;
import ai.securecode.reporting.repository.*;
import ai.securecode.reporting.service.CheatingInsightsReportService;
import ai.securecode.reporting.service.ReportExportService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reporting")
public class ReportingController {

    private final OrgAnalyticsRepository orgAnalyticsRepo;
    private final QuestionAnalyticsRepository questionAnalyticsRepo;
    private final SkillGapAnalysisRepository skillGapRepo;
    private final CheatingInsightsReportService cheatingInsightsService;
    private final ReportExportService exportService;

    public ReportingController(OrgAnalyticsRepository orgAnalyticsRepo,
                               QuestionAnalyticsRepository questionAnalyticsRepo,
                               SkillGapAnalysisRepository skillGapRepo,
                               CheatingInsightsReportService cheatingInsightsService,
                               ReportExportService exportService) {
        this.orgAnalyticsRepo = orgAnalyticsRepo;
        this.questionAnalyticsRepo = questionAnalyticsRepo;
        this.skillGapRepo = skillGapRepo;
        this.cheatingInsightsService = cheatingInsightsService;
        this.exportService = exportService;
    }

    @GetMapping("/orgs/{orgId}/analytics")
    public ResponseEntity<OrgAnalyticsResponse> getOrgAnalytics(@PathVariable UUID orgId) {
        return ResponseEntity.ok(orgAnalyticsRepo.findByOrgId(orgId)
                .map(a -> new OrgAnalyticsResponse(
                        a.getOrgId(), a.getTotalSessions(), a.getCompletedSessions(),
                        a.getTerminatedSessions(), a.getAvgScore(), a.getPassRate(),
                        a.getTotalViolations(), a.getConfirmedViolations(),
                        a.getHiringShortlisted(), a.getHiringRejected()))
                .orElseGet(() -> new OrgAnalyticsResponse(orgId, 0, 0, 0,
                        java.math.BigDecimal.ZERO, java.math.BigDecimal.ZERO, 0, 0, 0, 0)));
    }

    @GetMapping("/orgs/{orgId}/questions/analytics")
    public ResponseEntity<List<QuestionAnalyticsResponse>> getQuestionAnalytics(@PathVariable UUID orgId) {
        return ResponseEntity.ok(questionAnalyticsRepo.findByOrgId(orgId).stream()
                .map(q -> new QuestionAnalyticsResponse(
                        q.getQuestionId(), q.getQuestionType(), q.getDifficulty(),
                        q.getTimesAttempted(), q.getCorrectCount(),
                        q.getAvgTimeMs(), q.getDiscriminationIndex()))
                .toList());
    }

    @GetMapping("/orgs/{orgId}/analytics/skill-gap")
    public ResponseEntity<List<SkillGapResponse>> getSkillGapAnalysis(@PathVariable UUID orgId) {
        return ResponseEntity.ok(skillGapRepo.findByOrgId(orgId).stream()
                .map(s -> new SkillGapResponse(
                        s.getSkillTag(), s.getTotalAttempts(),
                        s.getPassCount(), s.getAvgScore()))
                .toList());
    }

    @PostMapping("/orgs/{orgId}/analytics/refresh")
    public ResponseEntity<OrgAnalyticsResponse> refreshAnalytics(@PathVariable UUID orgId) {
        // In a full implementation, this would trigger a re-aggregation from raw data.
        // For now, return current or empty.
        return getOrgAnalytics(orgId);
    }

    @GetMapping("/orgs/{orgId}/cheating-insights")
    public ResponseEntity<CheatingInsightsReportService.CheatingInsightsReport> getCheatingInsights(@PathVariable UUID orgId) {
        var analytics = orgAnalyticsRepo.findByOrgId(orgId).orElse(null);
        if (analytics == null) {
            return ResponseEntity.ok(cheatingInsightsService.buildFunnel(0, 0, 0, 0, 0, 0) != null ?
                    new CheatingInsightsReportService.CheatingInsightsReport(
                            orgId,
                            cheatingInsightsService.buildFunnel(0, 0, 0, 0, 0, 0),
                            List.of(),
                            java.util.Map.of(),
                            java.math.BigDecimal.ZERO,
                            0, 0, java.math.BigDecimal.ZERO
                    ) : null);
        }

        var funnel = cheatingInsightsService.buildFunnel(
                analytics.getTotalSessions(),
                analytics.getTotalViolations(),
                analytics.getTotalViolations() / 3,
                analytics.getTotalViolations() / 2,
                analytics.getConfirmedViolations(),
                analytics.getTerminatedSessions()
        );

        var discrimination = questionAnalyticsRepo.findByOrgId(orgId).stream()
                .map(q -> new CheatingInsightsReportService.QuestionDiscrimination(
                        q.getQuestionId(),
                        q.getCorrectCount(),
                        q.getTimesAttempted() - q.getCorrectCount(),
                        q.getTimesAttempted(),
                        q.getDiscriminationIndex() != null ? q.getDiscriminationIndex() : java.math.BigDecimal.ZERO,
                        cheatingInsightsService.rateDiscriminationIndex(
                                q.getDiscriminationIndex() != null ? q.getDiscriminationIndex() : java.math.BigDecimal.ZERO)
                ))
                .toList();

        BigDecimal violationRate = cheatingInsightsService.computeViolationRate(
                analytics.getTotalViolations(), analytics.getTotalSessions());

        return ResponseEntity.ok(new CheatingInsightsReportService.CheatingInsightsReport(
                orgId,
                funnel,
                discrimination,
                java.util.Map.of(),
                analytics.getAvgScore(),
                analytics.getTotalSessions(),
                analytics.getTotalViolations(),
                violationRate
        ));
    }

    // ── Export endpoints (FR-RPT-06) ──

    @GetMapping("/orgs/{orgId}/analytics/export")
    public ResponseEntity<byte[]> exportOrgAnalytics(
            @PathVariable UUID orgId,
            @RequestParam(defaultValue = "csv") String format) {
        var analytics = orgAnalyticsRepo.findByOrgId(orgId)
                .map(a -> new OrgAnalyticsResponse(
                        a.getOrgId(), a.getTotalSessions(), a.getCompletedSessions(),
                        a.getTerminatedSessions(), a.getAvgScore(), a.getPassRate(),
                        a.getTotalViolations(), a.getConfirmedViolations(),
                        a.getHiringShortlisted(), a.getHiringRejected()))
                .orElseGet(() -> new OrgAnalyticsResponse(orgId, 0, 0, 0,
                        BigDecimal.ZERO, BigDecimal.ZERO, 0, 0, 0, 0));

        if ("pdf".equalsIgnoreCase(format)) {
            byte[] pdf = exportService.exportOrgAnalyticsToPdf(analytics, orgId);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=org-analytics-" + orgId + ".pdf")
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(pdf);
        }

        String csv = exportService.exportOrgAnalyticsToCsv(analytics, orgId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=org-analytics-" + orgId + ".csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv.getBytes());
    }

    @GetMapping("/orgs/{orgId}/questions/analytics/export")
    public ResponseEntity<byte[]> exportQuestionAnalytics(
            @PathVariable UUID orgId,
            @RequestParam(defaultValue = "csv") String format) {
        var data = questionAnalyticsRepo.findByOrgId(orgId).stream()
                .map(q -> new QuestionAnalyticsResponse(
                        q.getQuestionId(), q.getQuestionType(), q.getDifficulty(),
                        q.getTimesAttempted(), q.getCorrectCount(),
                        q.getAvgTimeMs(), q.getDiscriminationIndex()))
                .toList();

        if ("pdf".equalsIgnoreCase(format)) {
            byte[] pdf = exportService.exportQuestionAnalyticsToPdf(data, orgId);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=question-analytics-" + orgId + ".pdf")
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(pdf);
        }

        String csv = exportService.exportQuestionAnalyticsToCsv(data);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=question-analytics-" + orgId + ".csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv.getBytes());
    }

    @GetMapping("/orgs/{orgId}/analytics/skill-gap/export")
    public ResponseEntity<byte[]> exportSkillGap(
            @PathVariable UUID orgId,
            @RequestParam(defaultValue = "csv") String format) {
        var data = skillGapRepo.findByOrgId(orgId).stream()
                .map(s -> new SkillGapResponse(
                        s.getSkillTag(), s.getTotalAttempts(),
                        s.getPassCount(), s.getAvgScore()))
                .toList();

        if ("pdf".equalsIgnoreCase(format)) {
            byte[] pdf = exportService.exportSkillGapToPdf(data, orgId);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=skill-gap-" + orgId + ".pdf")
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(pdf);
        }

        String csv = exportService.exportSkillGapToCsv(data);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=skill-gap-" + orgId + ".csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv.getBytes());
    }

    @GetMapping("/orgs/{orgId}/cheating-insights/export")
    public ResponseEntity<byte[]> exportCheatingInsights(
            @PathVariable UUID orgId,
            @RequestParam(defaultValue = "csv") String format) {
        var report = getCheatingInsights(orgId).getBody();
        if (report == null) {
            return ResponseEntity.notFound().build();
        }

        if ("pdf".equalsIgnoreCase(format)) {
            byte[] pdf = exportService.exportCheatingInsightsToPdf(report);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=cheating-insights-" + orgId + ".pdf")
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(pdf);
        }

        String csv = exportService.exportCheatingInsightsToCsv(report);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=cheating-insights-" + orgId + ".csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv.getBytes());
    }
}
