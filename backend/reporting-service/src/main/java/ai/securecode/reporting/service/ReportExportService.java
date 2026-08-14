package ai.securecode.reporting.service;

import ai.securecode.reporting.dto.OrgAnalyticsResponse;
import ai.securecode.reporting.dto.QuestionAnalyticsResponse;
import ai.securecode.reporting.dto.SkillGapResponse;
import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
public class ReportExportService {

    private static final Font TITLE_FONT = new Font(Font.HELVETICA, 18, Font.BOLD);
    private static final Font SUBTITLE_FONT = new Font(Font.HELVETICA, 12, Font.NORMAL);
    private static final Font HEADER_FONT = new Font(Font.HELVETICA, 11, Font.BOLD, Color.WHITE);
    private static final Font BODY_FONT = new Font(Font.HELVETICA, 10, Font.NORMAL);
    private static final Font SMALL_FONT = new Font(Font.HELVETICA, 8, Font.ITALIC, Color.GRAY);
    private static final Color HEADER_BG = new Color(63, 81, 181);
    private static final Color ALT_ROW_BG = new Color(245, 247, 250);

    public byte[] exportOrgAnalyticsToPdf(OrgAnalyticsResponse data, UUID orgId) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 36, 36, 54, 36);
            PdfWriter.getInstance(document, baos);
            document.open();

            addReportHeader(document, "Organization Analytics Report", orgId.toString());

            PdfPTable table = new PdfPTable(2);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{40f, 60f});

            addKeyValueRow(table, "Organization ID", orgId.toString());
            addKeyValueRow(table, "Total Sessions", String.valueOf(data.totalSessions()));
            addKeyValueRow(table, "Completed Sessions", String.valueOf(data.completedSessions()));
            addKeyValueRow(table, "Terminated Sessions", String.valueOf(data.terminatedSessions()));
            addKeyValueRow(table, "Average Score", data.avgScore().toPlainString());
            addKeyValueRow(table, "Pass Rate", data.passRate().toPlainString() + "%");
            addKeyValueRow(table, "Total Violations", String.valueOf(data.totalViolations()));
            addKeyValueRow(table, "Confirmed Violations", String.valueOf(data.confirmedViolations()));
            addKeyValueRow(table, "Hiring Shortlisted", String.valueOf(data.hiringShortlisted()));
            addKeyValueRow(table, "Hiring Rejected", String.valueOf(data.hiringRejected()));

            document.add(table);
            addReportFooter(document);
            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate PDF report", e);
        }
    }

    public byte[] exportQuestionAnalyticsToPdf(List<QuestionAnalyticsResponse> data, UUID orgId) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4.rotate(), 36, 36, 54, 36);
            PdfWriter.getInstance(document, baos);
            document.open();

            addReportHeader(document, "Question Analytics Report", orgId.toString());

            PdfPTable table = new PdfPTable(6);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{20f, 15f, 15f, 15f, 15f, 20f});

            addTableHeader(table, new String[]{"Question ID", "Type", "Difficulty", "Times Attempted", "Correct Count", "Discrimination Index"});

            for (int i = 0; i < data.size(); i++) {
                QuestionAnalyticsResponse q = data.get(i);
                if (i % 2 == 1) {
                    table.getDefaultCell().setBackgroundColor(ALT_ROW_BG);
                } else {
                    table.getDefaultCell().setBackgroundColor(Color.WHITE);
                }
                table.addCell(new Phrase(q.questionId().toString(), BODY_FONT));
                table.addCell(new Phrase(q.questionType(), BODY_FONT));
                table.addCell(new Phrase(q.difficulty() != null ? q.difficulty() : "N/A", BODY_FONT));
                table.addCell(new Phrase(String.valueOf(q.timesAttempted()), BODY_FONT));
                table.addCell(new Phrase(String.valueOf(q.correctCount()), BODY_FONT));
                table.addCell(new Phrase(q.discriminationIndex() != null ? q.discriminationIndex().toPlainString() : "N/A", BODY_FONT));
            }

            document.add(table);
            addReportFooter(document);
            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate PDF report", e);
        }
    }

    public byte[] exportSkillGapToPdf(List<SkillGapResponse> data, UUID orgId) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 36, 36, 54, 36);
            PdfWriter.getInstance(document, baos);
            document.open();

            addReportHeader(document, "Skill Gap Analysis Report", orgId.toString());

            PdfPTable table = new PdfPTable(4);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{30f, 20f, 20f, 30f});

            addTableHeader(table, new String[]{"Skill Tag", "Total Attempts", "Pass Count", "Average Score"});

            for (int i = 0; i < data.size(); i++) {
                SkillGapResponse s = data.get(i);
                if (i % 2 == 1) {
                    table.getDefaultCell().setBackgroundColor(ALT_ROW_BG);
                } else {
                    table.getDefaultCell().setBackgroundColor(Color.WHITE);
                }
                table.addCell(new Phrase(s.skillTag(), BODY_FONT));
                table.addCell(new Phrase(String.valueOf(s.totalAttempts()), BODY_FONT));
                table.addCell(new Phrase(String.valueOf(s.passCount()), BODY_FONT));
                table.addCell(new Phrase(s.avgScore().toPlainString(), BODY_FONT));
            }

            document.add(table);
            addReportFooter(document);
            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate PDF report", e);
        }
    }

    public byte[] exportCheatingInsightsToPdf(CheatingInsightsReportService.CheatingInsightsReport report) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 36, 36, 54, 36);
            PdfWriter.getInstance(document, baos);
            document.open();

            addReportHeader(document, "Cheating Insights Report", report.orgId().toString());
            document.add(Chunk.NEWLINE);

            document.add(new Paragraph("Funnel Analysis", TITLE_FONT));
            document.add(Chunk.NEWLINE);

            PdfPTable funnelTable = new PdfPTable(2);
            funnelTable.setWidthPercentage(100);
            funnelTable.setWidths(new float[]{50f, 50f});

            addTableHeader(funnelTable, new String[]{"Metric", "Count"});
            addFunnelRow(funnelTable, "Total Candidates", report.funnel().totalCandidates());
            addFunnelRow(funnelTable, "Flagged by Proctoring", report.funnel().flaggedByProctoring());
            addFunnelRow(funnelTable, "Flagged by Code Similarity", report.funnel().flaggedByCodeSimilarity());
            addFunnelRow(funnelTable, "Sent for Human Review", report.funnel().sentForHumanReview());
            addFunnelRow(funnelTable, "Confirmed Violations", report.funnel().confirmedViolations());
            addFunnelRow(funnelTable, "Auto-Terminated", report.funnel().autoTerminated());

            document.add(funnelTable);
            document.add(Chunk.NEWLINE);

            document.add(new Paragraph("Summary", SUBTITLE_FONT));
            document.add(Chunk.NEWLINE);

            PdfPTable summaryTable = new PdfPTable(2);
            summaryTable.setWidthPercentage(100);
            summaryTable.setWidths(new float[]{50f, 50f});
            addKeyValueRow(summaryTable, "Violation Rate", report.violationRate().toPlainString() + "%");
            addKeyValueRow(summaryTable, "Total Sessions", String.valueOf(report.totalSessions()));
            addKeyValueRow(summaryTable, "Sessions with Violations", String.valueOf(report.sessionsWithViolations()));
            addKeyValueRow(summaryTable, "Average Risk Score", report.avgRiskScore().toPlainString());
            document.add(summaryTable);

            if (report.discrimination() != null && !report.discrimination().isEmpty()) {
                document.add(Chunk.NEWLINE);
                document.add(new Paragraph("Question Discrimination Index", SUBTITLE_FONT));
                document.add(Chunk.NEWLINE);

                PdfPTable diTable = new PdfPTable(6);
                diTable.setWidthPercentage(100);
                diTable.setWidths(new float[]{20f, 15f, 15f, 15f, 15f, 20f});
                addTableHeader(diTable, new String[]{"Question ID", "Top Correct", "Bottom Correct", "Total", "DI Value", "Rating"});

                for (int i = 0; i < report.discrimination().size(); i++) {
                    var q = report.discrimination().get(i);
                    if (i % 2 == 1) {
                        diTable.getDefaultCell().setBackgroundColor(ALT_ROW_BG);
                    } else {
                        diTable.getDefaultCell().setBackgroundColor(Color.WHITE);
                    }
                    diTable.addCell(new Phrase(q.questionId().toString(), BODY_FONT));
                    diTable.addCell(new Phrase(String.valueOf(q.topGroupCorrect()), BODY_FONT));
                    diTable.addCell(new Phrase(String.valueOf(q.bottomGroupCorrect()), BODY_FONT));
                    diTable.addCell(new Phrase(String.valueOf(q.totalAttempts()), BODY_FONT));
                    diTable.addCell(new Phrase(q.discriminationIndex().toPlainString(), BODY_FONT));
                    diTable.addCell(new Phrase(q.qualityRating(), BODY_FONT));
                }
                document.add(diTable);
            }

            addReportFooter(document);
            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate cheating insights PDF", e);
        }
    }

    public String exportOrgAnalyticsToCsv(OrgAnalyticsResponse data, UUID orgId) {
        StringBuilder sb = new StringBuilder();
        sb.append("Metric,Value\n");
        sb.append("Organization ID,").append(orgId).append("\n");
        sb.append("Total Sessions,").append(data.totalSessions()).append("\n");
        sb.append("Completed Sessions,").append(data.completedSessions()).append("\n");
        sb.append("Terminated Sessions,").append(data.terminatedSessions()).append("\n");
        sb.append("Average Score,").append(data.avgScore()).append("\n");
        sb.append("Pass Rate,").append(data.passRate()).append("\n");
        sb.append("Total Violations,").append(data.totalViolations()).append("\n");
        sb.append("Confirmed Violations,").append(data.confirmedViolations()).append("\n");
        sb.append("Hiring Shortlisted,").append(data.hiringShortlisted()).append("\n");
        sb.append("Hiring Rejected,").append(data.hiringRejected()).append("\n");
        return sb.toString();
    }

    public String exportQuestionAnalyticsToCsv(List<QuestionAnalyticsResponse> data) {
        StringBuilder sb = new StringBuilder();
        sb.append("Question ID,Type,Difficulty,Times Attempted,Correct Count,Discrimination Index\n");
        for (QuestionAnalyticsResponse q : data) {
            sb.append(q.questionId()).append(",")
                    .append(q.questionType()).append(",")
                    .append(q.difficulty() != null ? q.difficulty() : "").append(",")
                    .append(q.timesAttempted()).append(",")
                    .append(q.correctCount()).append(",")
                    .append(q.discriminationIndex() != null ? q.discriminationIndex() : "").append("\n");
        }
        return sb.toString();
    }

    public String exportSkillGapToCsv(List<SkillGapResponse> data) {
        StringBuilder sb = new StringBuilder();
        sb.append("Skill Tag,Total Attempts,Pass Count,Average Score\n");
        for (SkillGapResponse s : data) {
            sb.append(s.skillTag()).append(",")
                    .append(s.totalAttempts()).append(",")
                    .append(s.passCount()).append(",")
                    .append(s.avgScore()).append("\n");
        }
        return sb.toString();
    }

    public String exportCheatingInsightsToCsv(CheatingInsightsReportService.CheatingInsightsReport report) {
        StringBuilder sb = new StringBuilder();
        sb.append("Section,Metric,Value\n");
        sb.append("Funnel,Total Candidates,").append(report.funnel().totalCandidates()).append("\n");
        sb.append("Funnel,Flagged by Proctoring,").append(report.funnel().flaggedByProctoring()).append("\n");
        sb.append("Funnel,Flagged by Code Similarity,").append(report.funnel().flaggedByCodeSimilarity()).append("\n");
        sb.append("Funnel,Sent for Human Review,").append(report.funnel().sentForHumanReview()).append("\n");
        sb.append("Funnel,Confirmed Violations,").append(report.funnel().confirmedViolations()).append("\n");
        sb.append("Funnel,Auto-Terminated,").append(report.funnel().autoTerminated()).append("\n");
        sb.append("Summary,Violation Rate,").append(report.violationRate()).append("\n");
        sb.append("Summary,Total Sessions,").append(report.totalSessions()).append("\n");
        sb.append("Summary,Sessions with Violations,").append(report.sessionsWithViolations()).append("\n");
        sb.append("Summary,Average Risk Score,").append(report.avgRiskScore()).append("\n");

        if (report.discrimination() != null) {
            sb.append("\nQuestion ID,Top Correct,Bottom Correct,Total Attempts,DI Value,Rating\n");
            for (var q : report.discrimination()) {
                sb.append(q.questionId()).append(",")
                        .append(q.topGroupCorrect()).append(",")
                        .append(q.bottomGroupCorrect()).append(",")
                        .append(q.totalAttempts()).append(",")
                        .append(q.discriminationIndex()).append(",")
                        .append(q.qualityRating()).append("\n");
            }
        }
        return sb.toString();
    }

    private void addReportHeader(Document document, String title, String orgId) throws DocumentException {
        Paragraph titlePara = new Paragraph(title, TITLE_FONT);
        titlePara.setAlignment(Element.ALIGN_CENTER);
        document.add(titlePara);

        Paragraph orgPara = new Paragraph("Organization: " + orgId, SUBTITLE_FONT);
        orgPara.setAlignment(Element.ALIGN_CENTER);
        document.add(orgPara);

        Paragraph datePara = new Paragraph(
                "Generated: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")),
                SMALL_FONT);
        datePara.setAlignment(Element.ALIGN_CENTER);
        document.add(datePara);
        document.add(Chunk.NEWLINE);
    }

    private void addReportFooter(Document document) throws DocumentException {
        document.add(Chunk.NEWLINE);
        Paragraph footer = new Paragraph(
                "SecureCode AI - Confidential | Generated on " +
                        LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                SMALL_FONT);
        footer.setAlignment(Element.ALIGN_CENTER);
        document.add(footer);
    }

    private void addTableHeader(PdfPTable table, String[] headers) {
        table.getDefaultCell().setBackgroundColor(HEADER_BG);
        table.getDefaultCell().setPadding(8);
        for (String header : headers) {
            table.addCell(new Phrase(header, HEADER_FONT));
        }
        table.setHeaderRows(1);
    }

    private void addKeyValueRow(PdfPTable table, String key, String value) {
        table.getDefaultCell().setBackgroundColor(Color.WHITE);
        table.getDefaultCell().setPadding(6);
        Phrase keyPhrase = new Phrase(key, HEADER_FONT);
        PdfPCell keyCell = new PdfPCell(keyPhrase);
        keyCell.setBackgroundColor(new Color(237, 239, 243));
        keyCell.setPadding(6);
        table.addCell(keyCell);
        table.addCell(new Phrase(value, BODY_FONT));
    }

    private void addFunnelRow(PdfPTable table, String label, int value) {
        table.getDefaultCell().setBackgroundColor(Color.WHITE);
        table.getDefaultCell().setPadding(6);
        table.addCell(new Phrase(label, BODY_FONT));
        table.addCell(new Phrase(String.valueOf(value), BODY_FONT));
    }
}
