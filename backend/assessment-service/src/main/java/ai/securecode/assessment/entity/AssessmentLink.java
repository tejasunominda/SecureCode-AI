package ai.securecode.assessment.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "assessment_link")
public class AssessmentLink {

    @Id
    @GeneratedValue
    private java.util.UUID id;

    @Column(name = "applicant_id", nullable = false)
    private java.util.UUID applicantId;

    @Column(name = "template_id", nullable = false)
    private java.util.UUID templateId;

    @Column(name = "org_id", nullable = false)
    private java.util.UUID orgId;

    @Column(nullable = false, unique = true)
    private String token;

    @Column(nullable = false)
    private String status = "pending";

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "created_by", nullable = false)
    private java.util.UUID createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public java.util.UUID getId() { return id; }
    public void setId(java.util.UUID id) { this.id = id; }
    public java.util.UUID getApplicantId() { return applicantId; }
    public void setApplicantId(java.util.UUID applicantId) { this.applicantId = applicantId; }
    public java.util.UUID getTemplateId() { return templateId; }
    public void setTemplateId(java.util.UUID templateId) { this.templateId = templateId; }
    public java.util.UUID getOrgId() { return orgId; }
    public void setOrgId(java.util.UUID orgId) { this.orgId = orgId; }
    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
    public java.util.UUID getCreatedBy() { return createdBy; }
    public void setCreatedBy(java.util.UUID createdBy) { this.createdBy = createdBy; }
    public Instant getCreatedAt() { return createdAt; }
}
