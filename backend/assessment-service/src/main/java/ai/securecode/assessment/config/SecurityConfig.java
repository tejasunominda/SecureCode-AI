package ai.securecode.assessment.config;

import ai.securecode.common.security.RateLimitFilter;
import ai.securecode.common.security.SecurityHeadersFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.time.Duration;
import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    // SECURITY: never combine a wildcard origin with allowCredentials(true) —
    // that permits any website to make credentialed cross-origin requests.
    // Configure the concrete, comma-separated list of trusted web-app origins.
    @Value("${securecode.cors.allowed-origins:http://localhost:5173}")
    private String allowedOrigins;

    @Value("${securecode.ratelimit.api.max:200}")
    private int apiRateLimitMax;

    @Value("${securecode.jwt.filter.enabled:true}")
    private boolean jwtFilterEnabled;

    @Value("${securecode.security.permit-all:false}")
    private boolean permitAll;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, StringRedisTemplate redisTemplate) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> {
                    auth.requestMatchers("/api/v1/assessment/candidate/**").permitAll();
                    auth.requestMatchers("/api/v1/assessment/sessions/*/answer").permitAll();
                    auth.requestMatchers("/api/v1/assessment/sessions/*/code").permitAll();
                    auth.requestMatchers("/api/v1/assessment/sessions/*/code/run").permitAll();
                    auth.requestMatchers("/api/v1/assessment/sessions/*/submit").permitAll();
                    auth.requestMatchers("/api/v1/assessment/sessions/*/consent").permitAll();
                    auth.requestMatchers("/api/v1/assessment/sessions/*/autosave").permitAll();
                    auth.requestMatchers("/api/v1/assessment/sessions/*/proctoring").permitAll();
                    auth.requestMatchers("/api/v1/assessment/sessions/*/proctoring/detailed").permitAll();
                    auth.requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/assessment/questions").permitAll();
                    auth.requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/assessment/sessions/*/questions").permitAll();
                    auth.requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/assessment/sessions/*/report").permitAll();
                    auth.requestMatchers("/actuator/**").permitAll();
                    if (permitAll) {
                        auth.anyRequest().permitAll();
                    } else {
                        auth.anyRequest().authenticated();
                    }
                })
                .addFilterBefore(
                        new RateLimitFilter(redisTemplate, apiRateLimitMax, Duration.ofMinutes(1), "rl:api:"),
                        UsernamePasswordAuthenticationFilter.class
                )
                .addFilterBefore(new SecurityHeadersFilter(), RateLimitFilter.class);
        if (jwtFilterEnabled) {
            http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        }
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.asList(allowedOrigins.split(",")));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
