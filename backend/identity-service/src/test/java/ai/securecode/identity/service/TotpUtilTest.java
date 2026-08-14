package ai.securecode.identity.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class TotpUtilTest {

    @Test
    void generateSecret_returnsBase64String() {
        String secret = TotpUtil.generateSecret();
        assertNotNull(secret);
        assertTrue(secret.length() >= 16, "Secret should be at least 16 chars");
    }

    @Test
    void generateTotpUri_returnsValidUri() {
        String uri = TotpUtil.generateTotpUri("test@securecode.ai", "JBSWY3DPEHPK3PXP");
        assertNotNull(uri);
        assertTrue(uri.startsWith("otpauth://totp/"));
        assertTrue(uri.contains("issuer=SecureCodeAI"));
        assertTrue(uri.contains("secret=JBSWY3DPEHPK3PXP"));
    }

    @Test
    void verifyCode_rejectsWrongCode() {
        String secret = TotpUtil.generateSecret();
        assertFalse(TotpUtil.verifyCode(secret, 0), "Wrong code should not verify");
    }

    @Test
    void verifyCode_rejectsWrongCodeWithWindow() {
        String secret = TotpUtil.generateSecret();
        assertFalse(TotpUtil.verifyCode(secret, 999999, 2), "Wrong code should not verify even with window");
    }
}
