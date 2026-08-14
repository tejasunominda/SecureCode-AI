package ai.securecode.proctoring.websocket;

import ai.securecode.proctoring.entity.ProctoringEvent;
import ai.securecode.proctoring.entity.RiskScoreSnapshot;
import ai.securecode.proctoring.repository.ProctoringEventRepository;
import ai.securecode.proctoring.service.RiskScoringEngine;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
public class ProctoringWebSocketHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(ProctoringWebSocketHandler.class);

    private final List<WebSocketSession> sessions = new CopyOnWriteArrayList<>();
    private final ProctoringEventRepository eventRepo;
    private final RiskScoringEngine riskEngine;
    private final ObjectMapper objectMapper;

    public ProctoringWebSocketHandler(ProctoringEventRepository eventRepo,
                                       RiskScoringEngine riskEngine) {
        this.eventRepo = eventRepo;
        this.riskEngine = riskEngine;
        this.objectMapper = new ObjectMapper();
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        sessions.add(session);
        log.info("WebSocket connected: {} (total: {})", session.getId(), sessions.size());
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessions.remove(session);
        log.info("WebSocket disconnected: {} (total: {})", session.getId(), sessions.size());
    }

    public void broadcastProctoringUpdate(UUID sessionId, String eventType) {
        if (sessions.isEmpty()) return;

        try {
            RiskScoreSnapshot snapshot = riskEngine.getScore(sessionId);
            List<ProctoringEvent> events = eventRepo.findBySessionIdOrderByOccurredAtAsc(sessionId);

            long warningCount = events.stream()
                    .filter(e -> e.getDeletedAt() == null)
                    .filter(e -> e.getSeverity() >= 2)
                    .count();

            boolean cameraActive = events.stream()
                    .noneMatch(e -> "face_lost".equals(e.getEventType()));

            String faceStatus = cameraActive ? "visible" : "not_detected";

            Map<String, Object> payload = Map.of(
                    "sessionId", sessionId.toString(),
                    "eventType", eventType,
                    "riskScore", snapshot.getScore().doubleValue(),
                    "warnings", warningCount,
                    "cameraActive", cameraActive,
                    "faceStatus", faceStatus,
                    "timestamp", Instant.now().toString()
            );

            String json = objectMapper.writeValueAsString(payload);
            for (WebSocketSession session : sessions) {
                if (session.isOpen()) {
                    try {
                        session.sendMessage(new org.springframework.web.socket.TextMessage(json));
                    } catch (IOException e) {
                        log.warn("Failed to send WebSocket message to {}", session.getId(), e);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to broadcast proctoring update for session {}", sessionId, e);
        }
    }
}
