package ai.securecode.assessment.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "applicant")
public class Applicant {

    @Id
    @GeneratedValue
    private java.util.UUID id;

    @Column(name = "org_id", nullable = false)
    private java.util.UUID orgId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String email;

    @Column(name = "resume_url")
    private String resumeUrl;

    @Column(nullable = false)
    private String status = "applied";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Column(name = "deleted_at")
    private Instant deletedAt;

    public java.util.UUID getId() { return id; }
    public void setId(java.util.UUID id) { this.id = id; }
    public java.util.UUID getOrgId() { return orgId; }
    public void setOrgId(java.util.UUID orgId) { this.orgId = orgId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getResumeUrl() { return resumeUrl; }
    public void setResumeUrl(String resumeUrl) { this.resumeUrl = resumeUrl; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
    public Instant getDeletedAt() { return deletedAt; }
    public void setDeletedAt(Instant deletedAt) { this.deletedAt = deletedAt; }
}
