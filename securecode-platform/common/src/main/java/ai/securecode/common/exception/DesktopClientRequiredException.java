package ai.securecode.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Thrown when a proctoring signal handler that requires the native Desktop
 * Client (VM detection, RDP detection, multi-display detection, process
 * monitoring — PRD FR-PROC-08..11) is invoked from a browser-only session.
 *
 * PRD Business Rule A.19.4 requires desktop-only capabilities to NEVER be
 * silently unavailable or faked as working — the caller must be told, loudly,
 * that the capability does not exist in this context. This is why
 * implementations of desktop-only {@code ProctoringSignalDetector}s throw
 * this instead of returning an empty/no-op result: a no-op would violate the
 * PRD's honesty requirement by implying "checked, nothing found" rather than
 * "not checked at all".
 */
public class DesktopClientRequiredException extends ApiException {

    public DesktopClientRequiredException(String capability) {
        super(
                "DESKTOP_CLIENT_REQUIRED",
                HttpStatus.CONFLICT,
                "Capability '" + capability + "' requires the Desktop Client and is not available in the browser-only session.",
                null
        );
    }
}
