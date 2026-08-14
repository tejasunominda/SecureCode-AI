package ai.securecode.common.audit;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Read-only side of the audit log, segregated from {@link AuditLogAppender}
 * (ISP) so query-only callers (e.g., the Auditor role's export endpoint)
 * never depend on a type that could also mutate the log.
 */
public interface AuditLogReader {

    List<AuditLogEntry> findByOrg(UUID orgId, String entityType, Instant from, Instant to);

    List<AuditLogEntry> findByEntity(UUID orgId, String entityType, UUID entityId);
}
