package ai.securecode.identity.repository;

import ai.securecode.identity.entity.AuditLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface AuditLogRepository extends JpaRepository<AuditLogEntity, Long> {

    List<AuditLogEntity> findByOrgIdAndCreatedAtBetweenOrderByCreatedAtAsc(
            UUID orgId, Instant from, Instant to);

    List<AuditLogEntity> findByOrgIdAndEntityTypeAndCreatedAtBetweenOrderByCreatedAtAsc(
            UUID orgId, String entityType, Instant from, Instant to);

    List<AuditLogEntity> findByOrgIdAndEntityTypeAndEntityIdOrderByCreatedAtAsc(
            UUID orgId, String entityType, UUID entityId);

    @Query("SELECT e.entryHash FROM AuditLogEntity e WHERE e.orgId = ?1 ORDER BY e.id DESC LIMIT 1")
    String findLatestHashByOrgId(UUID orgId);
}
