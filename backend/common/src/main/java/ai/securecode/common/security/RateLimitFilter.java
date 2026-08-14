package ai.securecode.common.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.concurrent.TimeUnit;

/**
 * Redis-backed sliding-window rate limiter.
 * <p>
 * Limits requests per IP address (or any custom key) within a configurable
 * time window. Returns HTTP 429 (Too Many Requests) with a
 * Retry-After header when the limit is exceeded.
 */
public class RateLimitFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitFilter.class);

    private final StringRedisTemplate redisTemplate;
    private final int maxRequests;
    private final Duration window;
    private final String keyPrefix;

    /**
     * @param redisTemplate Redis template for counter storage
     * @param maxRequests   Maximum requests allowed in the window
     * @param window        Time window for the rate limit
     * @param keyPrefix     Prefix for Redis keys (e.g. "rl:auth:")
     */
    public RateLimitFilter(StringRedisTemplate redisTemplate, int maxRequests, Duration window, String keyPrefix) {
        this.redisTemplate = redisTemplate;
        this.maxRequests = maxRequests;
        this.window = window;
        this.keyPrefix = keyPrefix;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String clientKey = resolveClientKey(request);
        String redisKey = keyPrefix + clientKey;

        Long current;
        try {
            current = redisTemplate.opsForValue().increment(redisKey);
            if (current != null && current == 1) {
                redisTemplate.expire(redisKey, window.getSeconds(), TimeUnit.SECONDS);
            }
        } catch (Exception e) {
            log.warn("Rate limit Redis error, allowing request: {}", e.getMessage());
            filterChain.doFilter(request, response);
            return;
        }

        if (current != null && current > maxRequests) {
            Long ttl = redisTemplate.getExpire(redisKey, TimeUnit.SECONDS);
            long retryAfter = ttl != null && ttl > 0 ? ttl : window.getSeconds();

            log.warn("Rate limit exceeded for key={} count={}/{}", clientKey, current, maxRequests);

            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setHeader("Retry-After", String.valueOf(retryAfter));
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write(
                    "{\"error\":{\"code\":\"RATE_LIMIT_EXCEEDED\","
                    + "\"message\":\"Too many requests. Please try again in "
                    + retryAfter + " seconds.\","
                    + "\"field\":null,"
                    + "\"requestId\":null}}"
            );
            return;
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Resolve the rate-limit key from the request. Uses X-Forwarded-For if
     * present (behind a proxy/load balancer), otherwise falls back to the
     * remote address.
     */
    protected String resolveClientKey(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
