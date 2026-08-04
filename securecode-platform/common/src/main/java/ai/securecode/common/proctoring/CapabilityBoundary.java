package ai.securecode.common.proctoring;

/**
 * Every proctoring capability description surfaced in an API response or UI
 * must be tagged with exactly one of these values (PRD FR-PROC-13,
 * Business Rule A.19.4). Placed in {@code common} so both the
 * proctoring-service (server truth) and assessment-service (consent/UI
 * copy) share a single source of truth and cannot drift into inconsistent
 * labeling.
 */
public enum CapabilityBoundary {
    BROWSER,
    DESKTOP_CLIENT_REQUIRED
}
