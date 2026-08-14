package ai.securecode.common.exception;

import org.springframework.http.HttpStatus;

public class ForbiddenOperationException extends ApiException {

    public ForbiddenOperationException(String message) {
        super("FORBIDDEN", HttpStatus.FORBIDDEN, message, null);
    }
}
