package ai.securecode.assessment.config;

import ai.securecode.common.dto.ApiErrorResponse;
import ai.securecode.common.exception.AbstractApiExceptionHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class AssessmentExceptionHandler extends AbstractApiExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(AssessmentExceptionHandler.class);

    @Override
    @org.springframework.web.bind.annotation.ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleUnexpected(Exception ex) {
        log.error("Unhandled exception in assessment service", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiErrorResponse.of("INTERNAL_ERROR", "An unexpected error occurred", null, null));
    }
}
