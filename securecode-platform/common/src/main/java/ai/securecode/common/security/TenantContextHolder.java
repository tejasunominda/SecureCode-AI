package ai.securecode.common.security;

import ai.securecode.common.exception.ForbiddenOperationException;

/**
 * Request-scoped holder for the current {@link TenantContext}, populated by
 * the JWT authentication filter in each service's security config (never set
 * from request-body content). Base repositories/services call
 * {@link #requireCurrent()} to scope every query by {@code org_id}, rather
 * than trusting any org_id passed by the client.
 */
public final class TenantContextHolder {

    private static final ThreadLocal<TenantContext> CURRENT = new ThreadLocal<>();

    private TenantContextHolder() {
    }

    public static void set(TenantContext context) {
        CURRENT.set(context);
    }

    public static TenantContext requireCurrent() {
        TenantContext context = CURRENT.get();
        if (context == null) {
            throw new ForbiddenOperationException("No authenticated tenant context present on this request");
        }
        return context;
    }

    public static void clear() {
        CURRENT.remove();
    }
}
