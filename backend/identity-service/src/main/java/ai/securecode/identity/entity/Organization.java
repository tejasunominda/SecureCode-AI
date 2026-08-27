package ai.securecode.identity.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "organization")
public class Organization {

    @Id
    private UUID id;

    @PrePersist
    void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }
    }

    @Column(name = "parent_org_id")
    private UUID parentOrgId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String tier = "starter";

    @Column(name = "data_residency")
    private String dataResidency = "us";

    @Column(nullable = false)
    private String status = "active";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Column(name = "deleted_at")
    private Instant deletedAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getParentOrgId() { return parentOrgId; }
    public void setParentOrgId(UUID parentOrgId) { this.parentOrgId = parentOrgId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getTier() { return tier; }
    public void setTier(String tier) { this.tier = tier; }
    public String getDataResidency() { return dataResidency; }
    public void setDataResidency(String dataResidency) { this.dataResidency = dataResidency; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
    public Instant getDeletedAt() { return deletedAt; }
    public void setDeletedAt(Instant deletedAt) { this.deletedAt = deletedAt; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
