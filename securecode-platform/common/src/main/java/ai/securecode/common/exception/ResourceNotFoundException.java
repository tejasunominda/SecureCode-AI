package ai.securecode.common.exception;

import org.springframework.http.HttpStatus;

public class ResourceNotFoundException extends ApiException {

    public ResourceNotFoundException(String entityType, Object id) {
        super("NOT_FOUND", HttpStatus.NOT_FOUND, entityType + " not found: " + id, null);
    }
}
