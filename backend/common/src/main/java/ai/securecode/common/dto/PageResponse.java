package ai.securecode.common.dto;

import java.util.List;

/**
 * Generic paginated response wrapper for list endpoints.
 *
 * @param content  the items on the current page
 * @param page     current page number (0-based)
 * @param size     page size
 * @param totalElements  total number of items across all pages
 * @param totalPages     total number of pages
 */
public record PageResponse<T>(
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages
) {
    public static <T> PageResponse<T> of(List<T> content, int page, int size, long totalElements) {
        int totalPages = size > 0 ? (int) Math.ceil((double) totalElements / size) : 0;
        return new PageResponse<>(content, page, size, totalElements, totalPages);
    }
}
