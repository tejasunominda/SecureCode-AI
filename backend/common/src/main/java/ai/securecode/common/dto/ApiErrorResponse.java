package ai.securecode.common.dto;

/**
 * Standard error envelope shape mandated by PRD Part D.4:
 * { "error": { "code", "message", "field", "request_id" } }
 */
public record ApiErrorResponse(ApiError error) {

    public record ApiError(String code, String message, String field, String requestId) {
    }

    public static ApiErrorResponse of(String code, String message, String field, String requestId) {
        return new ApiErrorResponse(new ApiError(code, message, field, requestId));
    }
}
