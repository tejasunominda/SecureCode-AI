package ai.securecode.assessment.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "assessment")
public class Assessment {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "org_id", nullable = false)
    private UUID orgId;

    @Column(name = "template_id", nullable = true)
    private UUID templateId;

    @Column(nullable = false)
    private String name;

    @Column(name = "scoring_config", columnDefinition = "jsonb")
    private String scoringConfig = "{\"passThreshold\": 60, \"negativeMarking\": false}";

    @Column(name = "proctoring_level", nullable = false)
    private String proctoringLevel = "standard";

    @Column(name = "locked_at")
    private Instant lockedAt;

    @Column(nullable = false)
    private int version = 1;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getOrgId() { return orgId; }
    public void setOrgId(UUID orgId) { this.orgId = orgId; }
    public UUID getTemplateId() { return templateId; }
    public void setTemplateId(UUID templateId) { this.templateId = templateId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getScoringConfig() { return scoringConfig; }
    public void setScoringConfig(String scoringConfig) { this.scoringConfig = scoringConfig; }
    public String getProctoringLevel() { return proctoringLevel; }
    public void setProctoringLevel(String proctoringLevel) { this.proctoringLevel = proctoringLevel; }
    public Instant getLockedAt() { return lockedAt; }
    public void setLockedAt(Instant lockedAt) { this.lockedAt = lockedAt; }
    public int getVersion() { return version; }
    public void setVersion(int version) { this.version = version; }
    public UUID getCreatedBy() { return createdBy; }
    public void setCreatedBy(UUID createdBy) { this.createdBy = createdBy; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public boolean isLocked() {
        return lockedAt != null;
    }
}
