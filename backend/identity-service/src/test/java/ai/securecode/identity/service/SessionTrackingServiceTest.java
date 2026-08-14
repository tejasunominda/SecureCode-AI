package ai.securecode.identity.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.ListOperations;

import java.time.Duration;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SessionTrackingServiceTest {

    @Mock
    private StringRedisTemplate redis;

    @Mock
    private ValueOperations<String, String> valueOps;

    @InjectMocks
    private SessionTrackingService service;

    private UUID userId;
    private UUID orgId;
    private String jti;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        orgId = UUID.randomUUID();
        jti = "test-jti-123";
    }

    @Test
    void recordSession_storesInRedisWithTimeout() {
        when(redis.opsForValue()).thenReturn(valueOps);

        service.recordSession(userId, orgId, jti);

        verify(valueOps).set(eq("securecode:session:" + userId + ":" + jti), eq(orgId.toString()), any(Duration.class));
    }

    @Test
    void isSessionActive_returnsTrueWhenKeyExists() {
        when(redis.hasKey("securecode:session:" + userId + ":" + jti)).thenReturn(true);

        assertTrue(service.isSessionActive(userId, jti));
    }

    @Test
    void isSessionActive_returnsFalseWhenKeyMissing() {
        when(redis.hasKey("securecode:session:" + userId + ":" + jti)).thenReturn(false);

        assertFalse(service.isSessionActive(userId, jti));
    }

    @Test
    void refreshSession_extendsTtl() {
        service.refreshSession(userId, jti);

        verify(redis).expire(eq("securecode:session:" + userId + ":" + jti), any(Duration.class));
    }

    @Test
    void terminateSession_deletesKey() {
        service.terminateSession(userId, jti);

        verify(redis).delete("securecode:session:" + userId + ":" + jti);
    }

    @Test
    void terminateAllSessions_deletesAllUserKeys() {
        Set<String> keys = Set.of(
                "securecode:session:" + userId + ":jti1",
                "securecode:session:" + userId + ":jti2"
        );
        when(redis.keys("securecode:session:" + userId + ":*")).thenReturn(keys);

        service.terminateAllSessions(userId);

        verify(redis).delete("securecode:session:" + userId + ":jti1");
        verify(redis).delete("securecode:session:" + userId + ":jti2");
    }
}
