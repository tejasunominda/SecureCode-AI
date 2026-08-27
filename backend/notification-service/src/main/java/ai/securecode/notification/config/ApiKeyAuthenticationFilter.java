package ai.securecode.notification.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextImpl;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class ApiKeyAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(ApiKeyAuthenticationFilter.class);

    private final String apiKey;

    public ApiKeyAuthenticationFilter(@Value("${securecode.security.api-key:}") String apiKey) {
        this.apiKey = apiKey;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String header = request.getHeader("X-Api-Key");
        if (apiKey != null && !apiKey.isBlank() && apiKey.equals(header)) {
                var auth = new UsernamePasswordAuthenticationToken(
                        "service",
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_SERVICE"))
                );
                auth.setDetails(request);
                SecurityContextHolder.setContext(new SecurityContextImpl(auth));
                log.info("Set API key authentication for request {}", request.getRequestURI());
            }
        log.info("After API key filter, authentication present: {}", SecurityContextHolder.getContext().getAuthentication() != null);
        filterChain.doFilter(request, response);
    }
}
