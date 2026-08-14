package ai.securecode.assessment.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "assessment_session")
public class AssessmentSession {

    @Id
    @GeneratedValue
    private java.util.UUID id;

    @Column(name = "link_id", nullable = false)
    private java.util.UUID linkId;

    @Column(name = "applicant_id", nullable = false)
    private java.util.UUID applicantId;

    @Column(name = "template_id", nullable = false)
    private java.util.UUID templateId;

    @Column(name = "org_id", nullable = false)
    private java.util.UUID orgId;

    @Column(nullable = false)
    private String status = "not_started";

    @Column(name = "current_section")
    private String currentSection;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public java.util.UUID getId() { return id; }
    public void setId(java.util.UUID id) { this.id = id; }
    public java.util.UUID getLinkId() { return linkId; }
    public void setLinkId(java.util.UUID linkId) { this.linkId = linkId; }
    public java.util.UUID getApplicantId() { return applicantId; }
    public void setApplicantId(java.util.UUID applicantId) { this.applicantId = applicantId; }
    public java.util.UUID getTemplateId() { return templateId; }
    public void setTemplateId(java.util.UUID templateId) { this.templateId = templateId; }
    public java.util.UUID getOrgId() { return orgId; }
    public void setOrgId(java.util.UUID orgId) { this.orgId = orgId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getCurrentSection() { return currentSection; }
    public void setCurrentSection(String currentSection) { this.currentSection = currentSection; }
    public Instant getStartedAt() { return startedAt; }
    public void setStartedAt(Instant startedAt) { this.startedAt = startedAt; }
    public Instant getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(Instant submittedAt) { this.submittedAt = submittedAt; }
    public Instant getCreatedAt() { return createdAt; }
}
