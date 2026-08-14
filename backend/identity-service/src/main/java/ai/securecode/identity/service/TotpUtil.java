package ai.securecode.identity.service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * TOTP (Time-based One-Time Password) implementation per RFC 6238.
 * Uses HMAC-SHA1 with 30-second time steps and 6-digit codes.
 */
public final class TotpUtil {

    private static final int TIME_STEP_SECONDS = 30;
    private static final int CODE_DIGITS = 6;
    private static final String HMAC_ALGORITHM = "HmacSHA1";

    private TotpUtil() {}

    public static String generateSecret() {
        byte[] bytes = new byte[20];
        new SecureRandom().nextBytes(bytes);
        return Base64.getEncoder().withoutPadding().encodeToString(bytes);
    }

    public static String generateTotpUri(String email, String secret) {
        return "otpauth://totp/SecureCodeAI:" + email + "?secret=" + secret + "&issuer=SecureCodeAI";
    }

    public static boolean verifyCode(String secret, int code) {
        return verifyCode(secret, code, 1);
    }

    public static boolean verifyCode(String secret, int code, int window) {
        long currentStep = System.currentTimeMillis() / 1000 / TIME_STEP_SECONDS;
        for (int i = -window; i <= window; i++) {
            int expected = generateCode(secret, currentStep + i);
            if (expected == code) {
                return true;
            }
        }
        return false;
    }

    private static int generateCode(String secret, long timeStep) {
        try {
            byte[] key = Base64.getDecoder().decode(secret);
            byte[] timeBytes = ByteBuffer.allocate(8).putLong(timeStep).array();

            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(key, HMAC_ALGORITHM));
            byte[] hash = mac.doFinal(timeBytes);

            int offset = hash[hash.length - 1] & 0xF;
            int truncated = ((hash[offset] & 0x7F) << 24) |
                    ((hash[offset + 1] & 0xFF) << 16) |
                    ((hash[offset + 2] & 0xFF) << 8) |
                    (hash[offset + 3] & 0xFF);

            return truncated % (int) Math.pow(10, CODE_DIGITS);
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate TOTP code", e);
        }
    }
}
