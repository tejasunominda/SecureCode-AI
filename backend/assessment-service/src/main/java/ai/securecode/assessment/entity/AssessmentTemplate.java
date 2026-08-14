package ai.securecode.assessment.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "assessment_template")
public class AssessmentTemplate {

    @Id
    @GeneratedValue
    private java.util.UUID id;

    @Column(name = "org_id", nullable = false)
    private java.util.UUID orgId;

    @Column(nullable = false)
    private String name;

    @Column(name = "aptitude_duration_min")
    private int aptitudeDurationMin = 20;

    @Column(name = "reasoning_duration_min")
    private int reasoningDurationMin = 20;

    @Column(name = "coding_duration_min")
    private int codingDurationMin = 50;

    @Column(name = "created_by", nullable = false)
    private java.util.UUID createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public java.util.UUID getId() { return id; }
    public void setId(java.util.UUID id) { this.id = id; }
    public java.util.UUID getOrgId() { return orgId; }
    public void setOrgId(java.util.UUID orgId) { this.orgId = orgId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public int getAptitudeDurationMin() { return aptitudeDurationMin; }
    public void setAptitudeDurationMin(int aptitudeDurationMin) { this.aptitudeDurationMin = aptitudeDurationMin; }
    public int getReasoningDurationMin() { return reasoningDurationMin; }
    public void setReasoningDurationMin(int reasoningDurationMin) { this.reasoningDurationMin = reasoningDurationMin; }
    public int getCodingDurationMin() { return codingDurationMin; }
    public void setCodingDurationMin(int codingDurationMin) { this.codingDurationMin = codingDurationMin; }
    public java.util.UUID getCreatedBy() { return createdBy; }
    public void setCreatedBy(java.util.UUID createdBy) { this.createdBy = createdBy; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
