package ai.securecode.identity.service;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.UUID;

/**
 * Tracks active sessions in Redis for idle-timeout and hard-lifetime enforcement
 * (FR-AUTH-09). Each access-token use refreshes the idle timer; if the idle
 * window expires, the token is considered stale even if JWT itself hasn't expired.
 */
@Service
public class SessionTrackingService {

    private static final String SESSION_KEY_PREFIX = "securecode:session:";
    private static final Duration DEFAULT_IDLE_TIMEOUT = Duration.ofMinutes(30);
    private static final Duration DEFAULT_HARD_TIMEOUT = Duration.ofHours(12);

    private final StringRedisTemplate redis;

    public SessionTrackingService(StringRedisTemplate redis) {
        this.redis = redis;
    }

    public void recordSession(UUID userId, UUID orgId, String tokenJti) {
        String key = SESSION_KEY_PREFIX + userId + ":" + tokenJti;
        String value = orgId.toString();
        redis.opsForValue().set(key, value, DEFAULT_IDLE_TIMEOUT);
    }

    public boolean isSessionActive(UUID userId, String tokenJti) {
        String key = SESSION_KEY_PREFIX + userId + ":" + tokenJti;
        return Boolean.TRUE.equals(redis.hasKey(key));
    }

    public void refreshSession(UUID userId, String tokenJti) {
        String key = SESSION_KEY_PREFIX + userId + ":" + tokenJti;
        redis.expire(key, DEFAULT_IDLE_TIMEOUT);
    }

    public void terminateSession(UUID userId, String tokenJti) {
        String key = SESSION_KEY_PREFIX + userId + ":" + tokenJti;
        redis.delete(key);
    }

    public void terminateAllSessions(UUID userId) {
        String pattern = SESSION_KEY_PREFIX + userId + ":*";
        redis.keys(pattern).forEach(redis::delete);
    }
}
