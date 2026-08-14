package ai.securecode.reporting.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "org_analytics")
public class OrgAnalytics {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "org_id", nullable = false, unique = true)
    private UUID orgId;

    @Column(name = "total_sessions", nullable = false)
    private int totalSessions;

    @Column(name = "completed_sessions", nullable = false)
    private int completedSessions;

    @Column(name = "terminated_sessions", nullable = false)
    private int terminatedSessions;

    @Column(name = "avg_score")
    private BigDecimal avgScore;

    @Column(name = "pass_rate")
    private BigDecimal passRate;

    @Column(name = "total_violations", nullable = false)
    private int totalViolations;

    @Column(name = "confirmed_violations", nullable = false)
    private int confirmedViolations;

    @Column(name = "hiring_shortlisted", nullable = false)
    private int hiringShortlisted;

    @Column(name = "hiring_rejected", nullable = false)
    private int hiringRejected;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getOrgId() { return orgId; }
    public void setOrgId(UUID orgId) { this.orgId = orgId; }
    public int getTotalSessions() { return totalSessions; }
    public void setTotalSessions(int totalSessions) { this.totalSessions = totalSessions; }
    public int getCompletedSessions() { return completedSessions; }
    public void setCompletedSessions(int completedSessions) { this.completedSessions = completedSessions; }
    public int getTerminatedSessions() { return terminatedSessions; }
    public void setTerminatedSessions(int terminatedSessions) { this.terminatedSessions = terminatedSessions; }
    public BigDecimal getAvgScore() { return avgScore; }
    public void setAvgScore(BigDecimal avgScore) { this.avgScore = avgScore; }
    public BigDecimal getPassRate() { return passRate; }
    public void setPassRate(BigDecimal passRate) { this.passRate = passRate; }
    public int getTotalViolations() { return totalViolations; }
    public void setTotalViolations(int totalViolations) { this.totalViolations = totalViolations; }
    public int getConfirmedViolations() { return confirmedViolations; }
    public void setConfirmedViolations(int confirmedViolations) { this.confirmedViolations = confirmedViolations; }
    public int getHiringShortlisted() { return hiringShortlisted; }
    public void setHiringShortlisted(int hiringShortlisted) { this.hiringShortlisted = hiringShortlisted; }
    public int getHiringRejected() { return hiringRejected; }
    public void setHiringRejected(int hiringRejected) { this.hiringRejected = hiringRejected; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
