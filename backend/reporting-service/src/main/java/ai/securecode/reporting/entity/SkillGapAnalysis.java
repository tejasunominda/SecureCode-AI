package ai.securecode.reporting.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "skill_gap_analysis")
public class SkillGapAnalysis {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "org_id", nullable = false)
    private UUID orgId;

    @Column(name = "skill_tag", nullable = false)
    private String skillTag;

    @Column(name = "total_attempts", nullable = false)
    private int totalAttempts;

    @Column(name = "pass_count", nullable = false)
    private int passCount;

    @Column(name = "avg_score")
    private BigDecimal avgScore;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getOrgId() { return orgId; }
    public void setOrgId(UUID orgId) { this.orgId = orgId; }
    public String getSkillTag() { return skillTag; }
    public void setSkillTag(String skillTag) { this.skillTag = skillTag; }
    public int getTotalAttempts() { return totalAttempts; }
    public void setTotalAttempts(int totalAttempts) { this.totalAttempts = totalAttempts; }
    public int getPassCount() { return passCount; }
    public void setPassCount(int passCount) { this.passCount = passCount; }
    public BigDecimal getAvgScore() { return avgScore; }
    public void setAvgScore(BigDecimal avgScore) { this.avgScore = avgScore; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
