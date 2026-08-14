package ai.securecode.common.audit;

/**
 * Insert-only contract for writing audit-log entries (PRD Section D.3 /
 * B.5.9: "hash-chained, append-only audit_log table... implement as an
 * insert-only repository with no update/delete methods exposed at all").
 * <p>
 * Interface Segregation: this port deliberately exposes only {@link #append}
 * and read-style lookups via {@link AuditLogReader} — no implementation of
 * this interface can be coerced into mutating or deleting a past entry
 * because the capability simply does not exist on the type.
 */
public interface AuditLogAppender {

    AuditLogEntry append(AuditLogEntry entry);
}
