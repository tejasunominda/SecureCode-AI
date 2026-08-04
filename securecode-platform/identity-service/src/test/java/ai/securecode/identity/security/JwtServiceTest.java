package ai.securecode.identity.security;

import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.time.Duration;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private JwtService jwtService;

    @BeforeEach
    void setUp() throws Exception {
        jwtService = new JwtService();
        setField(jwtService, "secret", "Y2hhbmdlLW1lLXBsZWFzZS1pYW0tYS1zdXBlci1zZWNyZXQta2V5LWZvci1qd3QtaG1hYy1zaGEtMjU2LWJpdHM=");
        setField(jwtService, "accessTokenTtl", Duration.ofMinutes(15));
        setField(jwtService, "refreshTokenTtl", Duration.ofDays(7));
        jwtService.init();
    }

    @Test
    void generateAccessToken_containsAllClaims() {
        UUID userId = UUID.randomUUID();
        UUID orgId = UUID.randomUUID();
        List<String> roles = List.of("ORG_ADMIN", "CANDIDATE");

        String token = jwtService.generateAccessToken(userId, orgId, "user@test.com", roles);

        Claims claims = jwtService.parseToken(token);
        assertThat(claims.getSubject()).isEqualTo(userId.toString());
        assertThat(claims.get("org_id", String.class)).isEqualTo(orgId.toString());
        assertThat(claims.get("email", String.class)).isEqualTo("user@test.com");
        assertThat(claims.get("roles", List.class)).containsExactly("ORG_ADMIN", "CANDIDATE");
        assertThat(claims.get("type", String.class)).isEqualTo("access");
    }

    @Test
    void generateRefreshToken_containsMinimalClaims() {
        UUID userId = UUID.randomUUID();
        UUID orgId = UUID.randomUUID();

        String token = jwtService.generateRefreshToken(userId, orgId);

        Claims claims = jwtService.parseToken(token);
        assertThat(claims.getSubject()).isEqualTo(userId.toString());
        assertThat(claims.get("org_id", String.class)).isEqualTo(orgId.toString());
        assertThat(claims.get("type", String.class)).isEqualTo("refresh");
    }

    @Test
    void isRefreshToken_returnsTrueForRefreshToken() {
        UUID userId = UUID.randomUUID();
        UUID orgId = UUID.randomUUID();

        String refreshToken = jwtService.generateRefreshToken(userId, orgId);
        Claims claims = jwtService.parseToken(refreshToken);

        assertThat(jwtService.isRefreshToken(claims)).isTrue();
    }

    @Test
    void isRefreshToken_returnsFalseForAccessToken() {
        UUID userId = UUID.randomUUID();
        UUID orgId = UUID.randomUUID();

        String accessToken = jwtService.generateAccessToken(userId, orgId, "user@test.com", List.of("ORG_ADMIN"));
        Claims claims = jwtService.parseToken(accessToken);

        assertThat(jwtService.isRefreshToken(claims)).isFalse();
    }

    @Test
    void parseToken_withInvalidToken_throwsJwtException() {
        assertThatThrownBy(() -> jwtService.parseToken("invalid.token.here"))
                .isInstanceOf(io.jsonwebtoken.JwtException.class);
    }

    @Test
    void parseToken_withNullToken_throwsJwtException() {
        assertThatThrownBy(() -> jwtService.parseToken(null))
                .isInstanceOf(Exception.class);
    }

    @Test
    void getAccessTokenTtlSeconds_returnsCorrectValue() {
        assertThat(jwtService.getAccessTokenTtlSeconds()).isEqualTo(900);
    }

    private void setField(Object target, String fieldName, Object value) throws Exception {
        Field field = target.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(target, value);
    }
}
