package ai.securecode.identity.controller;

import ai.securecode.common.audit.AuditLogEntry;
import ai.securecode.identity.service.AuditLogService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/audit")
public class AuditLogController {

    private final AuditLogService auditLogService;

    public AuditLogController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @GetMapping("/orgs/{orgId}")
    public ResponseEntity<List<AuditLogEntry>> getAuditLog(
            @PathVariable UUID orgId,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to) {
        return ResponseEntity.ok(auditLogService.findByOrg(orgId, entityType, from, to));
    }

    @GetMapping("/orgs/{orgId}/entities/{entityType}/{entityId}")
    public ResponseEntity<List<AuditLogEntry>> getEntityAuditLog(
            @PathVariable UUID orgId,
            @PathVariable String entityType,
            @PathVariable UUID entityId) {
        return ResponseEntity.ok(auditLogService.findByEntity(orgId, entityType, entityId));
    }

    @GetMapping("/orgs/{orgId}/export")
    public ResponseEntity<byte[]> exportAuditLog(
            @PathVariable UUID orgId,
            @RequestParam String format,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to) {
        List<AuditLogEntry> entries = auditLogService.findByOrg(orgId, entityType, from, to);
        HttpHeaders headers = new HttpHeaders();
        String filename = "audit-log-" + orgId;
        byte[] content;

        if ("csv".equalsIgnoreCase(format)) {
            content = exportToCsv(entries);
            headers.setContentType(MediaType.parseMediaType("text/csv"));
            filename += ".csv";
        } else if ("pdf".equalsIgnoreCase(format)) {
            content = exportToPdf(entries, orgId);
            headers.setContentType(MediaType.APPLICATION_PDF);
            filename += ".pdf";
        } else {
            return ResponseEntity.badRequest().build();
        }

        headers.setContentDispositionFormData("attachment", filename);
        return ResponseEntity.ok().headers(headers).body(content);
    }

    private byte[] exportToCsv(List<AuditLogEntry> entries) {
        StringBuilder sb = new StringBuilder();
        sb.append("Timestamp,Org ID,Actor User ID,Action,Entity Type,Entity ID,Prev Hash,Entry Hash\n");
        DateTimeFormatter fmt = DateTimeFormatter.ISO_INSTANT;
        for (AuditLogEntry e : entries) {
            sb.append(fmt.format(e.createdAt())).append(",")
                    .append(e.orgId()).append(",")
                    .append(e.actorUserId() != null ? e.actorUserId() : "").append(",")
                    .append(escapeCsv(e.action())).append(",")
                    .append(escapeCsv(e.entityType() != null ? e.entityType() : "")).append(",")
                    .append(e.entityId() != null ? e.entityId() : "").append(",")
                    .append(e.prevHash() != null ? e.prevHash() : "").append(",")
                    .append(e.entryHash() != null ? e.entryHash() : "").append("\n");
        }
        return sb.toString().getBytes();
    }

    private byte[] exportToPdf(List<AuditLogEntry> entries, UUID orgId) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            com.lowagie.text.Document document = new com.lowagie.text.Document(
                    com.lowagie.text.PageSize.A4.rotate(), 36, 36, 54, 36);
            com.lowagie.text.pdf.PdfWriter.getInstance(document, baos);
            document.open();

            com.lowagie.text.Paragraph title = new com.lowagie.text.Paragraph(
                    "Audit Log Report — Org " + orgId,
                    new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 16, com.lowagie.text.Font.BOLD));
            document.add(title);
            document.add(new com.lowagie.text.Paragraph(
                    "Generated: " + Instant.now().toString(),
                    new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 9, com.lowagie.text.Font.ITALIC)));
            document.add(com.lowagie.text.Chunk.NEWLINE);

            if (entries.isEmpty()) {
                document.add(new com.lowagie.text.Paragraph("No audit log entries found."));
            } else {
                com.lowagie.text.pdf.PdfPTable table = new com.lowagie.text.pdf.PdfPTable(8);
                table.setWidthPercentage(100);
                table.setWidths(new float[]{15f, 12f, 12f, 12f, 10f, 12f, 13f, 14f});

                com.lowagie.text.Font headerFont = new com.lowagie.text.Font(
                        com.lowagie.text.Font.HELVETICA, 8, com.lowagie.text.Font.BOLD);
                com.lowagie.text.Font bodyFont = new com.lowagie.text.Font(
                        com.lowagie.text.Font.HELVETICA, 7);

                String[] headers = {"Timestamp", "Org ID", "Actor", "Action", "Entity Type", "Entity ID", "Prev Hash", "Entry Hash"};
                for (String h : headers) {
                    com.lowagie.text.pdf.PdfPCell cell = new com.lowagie.text.pdf.PdfPCell(
                            new com.lowagie.text.Phrase(h, headerFont));
                    cell.setBackgroundColor(new java.awt.Color(220, 220, 220));
                    table.addCell(cell);
                }

                DateTimeFormatter fmt = DateTimeFormatter.ISO_INSTANT;
                for (AuditLogEntry e : entries) {
                    table.addCell(new com.lowagie.text.Phrase(fmt.format(e.createdAt()), bodyFont));
                    table.addCell(new com.lowagie.text.Phrase(e.orgId().toString(), bodyFont));
                    table.addCell(new com.lowagie.text.Phrase(
                            e.actorUserId() != null ? e.actorUserId().toString() : "", bodyFont));
                    table.addCell(new com.lowagie.text.Phrase(e.action(), bodyFont));
                    table.addCell(new com.lowagie.text.Phrase(
                            e.entityType() != null ? e.entityType() : "", bodyFont));
                    table.addCell(new com.lowagie.text.Phrase(
                            e.entityId() != null ? e.entityId().toString() : "", bodyFont));
                    table.addCell(new com.lowagie.text.Phrase(
                            e.prevHash() != null ? e.prevHash() : "", bodyFont));
                    table.addCell(new com.lowagie.text.Phrase(
                            e.entryHash() != null ? e.entryHash() : "", bodyFont));
                }
                document.add(table);
            }

            document.add(com.lowagie.text.Chunk.NEWLINE);
            document.add(new com.lowagie.text.Paragraph(
                    "Hash Chain Verification: Each entry's entryHash is computed from prevHash + canonical payload.",
                    new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 8, com.lowagie.text.Font.ITALIC)));

            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate PDF", e);
        }
    }

    private String escapeCsv(String value) {
        if (value == null) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }
}
