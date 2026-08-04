package ai.securecode.common.exception;

import org.springframework.http.HttpStatus;

public class ValidationException extends ApiException {

    public ValidationException(String message, String field) {
        super("VALIDATION_ERROR", HttpStatus.UNPROCESSABLE_ENTITY, message, field);
    }
}
