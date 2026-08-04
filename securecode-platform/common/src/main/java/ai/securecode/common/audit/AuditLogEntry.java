package ai.securecode.common.audit;

import java.time.Instant;
import java.util.UUID;

/**
 * Immutable representation of a single audit-log entry. Mirrors the
 * {@code audit_log} table (PRD Part D.2): hash-chained (prevHash -> entryHash)
 * and append-only.
 */
public record AuditLogEntry(
        UUID orgId,
        UUID actorUserId,
        String action,
        String entityType,
        UUID entityId,
        String prevHash,
        String entryHash,
        Instant createdAt
) {
}
