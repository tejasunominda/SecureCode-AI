package ai.securecode.common.security;

import java.util.UUID;

/**
 * Immutable snapshot of the authenticated principal's tenant/security
 * context, derived exclusively from the validated JWT — never from a
 * client-supplied {@code org_id} in a request body (PRD Section B.5.2).
 * <p>
 * Base repositories use {@link TenantContextHolder#requireCurrent()} to
 * auto-scope every query by {@code org_id}.
 */
public record TenantContext(UUID userId, UUID orgId, java.util.Set<String> roles) {

    public boolean hasRole(String roleCode) {
        return roles.contains(roleCode);
    }
}
