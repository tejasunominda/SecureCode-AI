package ai.securecode.execution.service;

import ai.securecode.execution.dto.ExecuteRequest;
import ai.securecode.execution.dto.ExecuteResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

/**
 * Redis-backed execution queue (FR-EDIT-04). Enqueues execution requests and
 * polls for results. Workers process the queue and write results back.
 */
@Service
public class ExecutionQueue {

    private static final String QUEUE_KEY = "securecode:execution:queue";
    private static final String RESULT_KEY_PREFIX = "securecode:execution:result:";
    private static final long RESULT_TTL_SECONDS = 60;

    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;
    private final ConcurrentHashMap<String, ExecuteResponse> localResults = new ConcurrentHashMap<>();

    public ExecutionQueue(StringRedisTemplate redis, ObjectMapper objectMapper) {
        this.redis = redis;
        this.objectMapper = objectMapper;
    }

    public String enqueue(ExecuteRequest request) {
        String requestId = UUID.randomUUID().toString();
        try {
            String json = objectMapper.writeValueAsString(new QueuedRequest(requestId, request));
            redis.opsForList().rightPush(QUEUE_KEY, json);
        } catch (Exception e) {
            throw new RuntimeException("Failed to enqueue execution request", e);
        }
        return requestId;
    }

    public QueuedRequest dequeue(long timeoutSeconds) {
        try {
            String json = redis.opsForList().leftPop(QUEUE_KEY, timeoutSeconds, TimeUnit.SECONDS);
            if (json == null) return null;
            return objectMapper.readValue(json, QueuedRequest.class);
        } catch (Exception e) {
            return null;
        }
    }

    public void publishResult(String requestId, ExecuteResponse response) {
        try {
            String json = objectMapper.writeValueAsString(response);
            redis.opsForValue().set(RESULT_KEY_PREFIX + requestId, json, RESULT_TTL_SECONDS, TimeUnit.SECONDS);
        } catch (Exception e) {
            localResults.put(requestId, response);
        }
    }

    public ExecuteResponse waitForResult(String requestId, long timeoutMs) {
        long deadline = System.currentTimeMillis() + timeoutMs;
        while (System.currentTimeMillis() < deadline) {
            if (localResults.containsKey(requestId)) {
                return localResults.remove(requestId);
            }
            String json = redis.opsForValue().get(RESULT_KEY_PREFIX + requestId);
            if (json != null) {
                redis.delete(RESULT_KEY_PREFIX + requestId);
                try {
                    return objectMapper.readValue(json, ExecuteResponse.class);
                } catch (Exception e) {
                    return ExecuteResponse.error("Failed to parse execution result");
                }
            }
            try { Thread.sleep(50); } catch (InterruptedException ignored) { break; }
        }
        return ExecuteResponse.timeout("Execution timed out waiting for result");
    }

    public record QueuedRequest(String requestId, ExecuteRequest request) {}
}
