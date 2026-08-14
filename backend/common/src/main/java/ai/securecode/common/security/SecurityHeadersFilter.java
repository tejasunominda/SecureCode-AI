package ai.securecode.common.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Adds standard security headers to every response:
 * <ul>
 *   <li>X-Content-Type-Options: nosniff — prevents MIME sniffing</li>
 *   <li>X-Frame-Options: DENY — prevents clickjacking</li>
 *   <li>Strict-Transport-Security — enforces HTTPS</li>
 *   <li>X-XSS-Protection — legacy XSS protection</li>
 *   <li>Cache-Control: no-store — prevents caching of API responses</li>
 *   <li>Content-Security-Policy — restricts resource loading</li>
 * </ul>
 */
public class SecurityHeadersFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setHeader("X-Frame-Options", "DENY");
        response.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
        response.setHeader("X-XSS-Protection", "1; mode=block");
        response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
        response.setHeader("Pragma", "no-cache");
        response.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");

        filterChain.doFilter(request, response);
    }
}
