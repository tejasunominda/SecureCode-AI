package ai.securecode.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Base type for all deliberate, client-facing API exceptions. Carries an error
 * code (matches PRD D.4 error envelope), an HTTP status, and an optional field
 * name for validation-style errors.
 */
public class ApiException extends RuntimeException {

    private final String code;
    private final HttpStatus status;
    private final String field;

    public ApiException(String code, HttpStatus status, String message, String field) {
        super(message);
        this.code = code;
        this.status = status;
        this.field = field;
    }

    public ApiException(String code, HttpStatus status, String message) {
        this(code, status, message, null);
    }

    public String getCode() {
        return code;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getField() {
        return field;
    }
}
