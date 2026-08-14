package ai.securecode.identity.service;

import ai.securecode.common.audit.AuditHashChain;
import ai.securecode.common.audit.AuditLogAppender;
import ai.securecode.common.audit.AuditLogEntry;
import ai.securecode.common.audit.AuditLogReader;
import ai.securecode.identity.entity.AuditLogEntity;
import ai.securecode.identity.repository.AuditLogRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class AuditLogService implements AuditLogAppender, AuditLogReader {

    private final AuditLogRepository repo;

    public AuditLogService(AuditLogRepository repo) {
        this.repo = repo;
    }

    @Override
    public AuditLogEntry append(AuditLogEntry entry) {
        String prevHash = repo.findLatestHashByOrgId(entry.orgId());
        if (prevHash == null) {
            prevHash = AuditHashChain.GENESIS_HASH;
        }

        String canonicalPayload = entry.orgId() + "|" +
                (entry.actorUserId() != null ? entry.actorUserId() : "") + "|" +
                entry.action() + "|" +
                (entry.entityType() != null ? entry.entityType() : "") + "|" +
                (entry.entityId() != null ? entry.entityId() : "") + "|" +
                entry.createdAt();
        String entryHash = AuditHashChain.computeEntryHash(prevHash, canonicalPayload);

        AuditLogEntity entity = new AuditLogEntity();
        entity.setOrgId(entry.orgId());
        entity.setActorUserId(entry.actorUserId());
        entity.setAction(entry.action());
        entity.setEntityType(entry.entityType());
        entity.setEntityId(entry.entityId());
        entity.setPrevHash(prevHash);
        entity.setEntryHash(entryHash);
        entity.setCreatedAt(entry.createdAt());
        entity = repo.save(entity);

        return new AuditLogEntry(
                entity.getOrgId(),
                entity.getActorUserId(),
                entity.getAction(),
                entity.getEntityType(),
                entity.getEntityId(),
                entity.getPrevHash(),
                entity.getEntryHash(),
                entity.getCreatedAt()
        );
    }

    @Override
    public List<AuditLogEntry> findByOrg(UUID orgId, String entityType, Instant from, Instant to) {
        Instant effectiveFrom = from != null ? from : Instant.EPOCH;
        Instant effectiveTo = to != null ? to : Instant.now();

        List<AuditLogEntity> entities;
        if (entityType != null && !entityType.isBlank()) {
            entities = repo.findByOrgIdAndEntityTypeAndCreatedAtBetweenOrderByCreatedAtAsc(
                    orgId, entityType, effectiveFrom, effectiveTo);
        } else {
            entities = repo.findByOrgIdAndCreatedAtBetweenOrderByCreatedAtAsc(
                    orgId, effectiveFrom, effectiveTo);
        }

        return entities.stream()
                .map(e -> new AuditLogEntry(
                        e.getOrgId(), e.getActorUserId(), e.getAction(),
                        e.getEntityType(), e.getEntityId(),
                        e.getPrevHash(), e.getEntryHash(), e.getCreatedAt()))
                .toList();
    }

    @Override
    public List<AuditLogEntry> findByEntity(UUID orgId, String entityType, UUID entityId) {
        return repo.findByOrgIdAndEntityTypeAndEntityIdOrderByCreatedAtAsc(orgId, entityType, entityId)
                .stream()
                .map(e -> new AuditLogEntry(
                        e.getOrgId(), e.getActorUserId(), e.getAction(),
                        e.getEntityType(), e.getEntityId(),
                        e.getPrevHash(), e.getEntryHash(), e.getCreatedAt()))
                .toList();
    }

    public void log(UUID orgId, UUID actorUserId, String action, String entityType, UUID entityId) {
        append(new AuditLogEntry(
                orgId, actorUserId, action, entityType, entityId,
                null, null, Instant.now()
        ));
    }
}
