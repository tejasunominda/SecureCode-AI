package ai.securecode.common.audit;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/**
 * Computes the SHA-256 hash chain link for a new audit-log entry:
 * {@code entryHash = SHA256(prevHash + canonicalPayload)}.
 * Kept as a pure, stateless utility so the tamper-evidence guarantee does not
 * depend on any single service's persistence layer being trusted blindly.
 */
public final class AuditHashChain {

    public static final String GENESIS_HASH = "0".repeat(64);

    private AuditHashChain() {
    }

    public static String computeEntryHash(String prevHash, String canonicalPayload) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            digest.update(prevHash.getBytes(StandardCharsets.UTF_8));
            digest.update(canonicalPayload.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest.digest());
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available on this JVM", e);
        }
    }
}
