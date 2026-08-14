package ai.securecode.identity.service;

import org.springframework.http.HttpStatus;
import ai.securecode.common.exception.ApiException;

public class MfaRequiredException extends ApiException {

    private final String mfaToken;

    public MfaRequiredException(String mfaToken) {
        super("MFA_REQUIRED", HttpStatus.OK, "MFA verification required", "mfa_token");
        this.mfaToken = mfaToken;
    }

    public String getMfaToken() {
        return mfaToken;
    }
}
