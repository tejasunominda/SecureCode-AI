package ai.securecode.proctoring.kafka;

import ai.securecode.proctoring.entity.ProctoringEvent;
import ai.securecode.proctoring.repository.ProctoringEventRepository;
import ai.securecode.proctoring.service.RiskScoringEngine;
import ai.securecode.proctoring.websocket.ProctoringWebSocketHandler;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.UUID;

@Component
public class ProctoringEventConsumer {

    private final ProctoringEventRepository eventRepo;
    private final RiskScoringEngine riskEngine;
    private final ProctoringWebSocketHandler wsHandler;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ProctoringEventConsumer(ProctoringEventRepository eventRepo,
                                    RiskScoringEngine riskEngine,
                                    ProctoringWebSocketHandler wsHandler) {
        this.eventRepo = eventRepo;
        this.riskEngine = riskEngine;
        this.wsHandler = wsHandler;
    }

    @KafkaListener(topics = "proctoring-events", groupId = "proctoring-service")
    public void consume(String message) {
        try {
            JsonNode node = objectMapper.readTree(message);
            UUID sessionId = UUID.fromString(node.get("sessionId").asText());
            String eventType = node.get("eventType").asText();
            String source = node.has("source") ? node.get("source").asText() : "browser";
            String evidenceUri = node.has("evidenceUri") ? node.get("evidenceUri").asText() : null;
            short severity = node.has("severity") ? (short) node.get("severity").asInt() : 1;

            ProctoringEvent event = new ProctoringEvent();
            event.setId(UUID.randomUUID());
            event.setSessionId(sessionId);
            event.setEventType(eventType);
            event.setSource(source);
            event.setSeverity(severity);
            event.setEvidenceUri(evidenceUri);
            event.setOccurredAt(Instant.now());
            eventRepo.save(event);

            riskEngine.recomputeScore(sessionId);
            wsHandler.broadcastProctoringUpdate(sessionId, eventType);
        } catch (Exception e) {
            // Log and skip — don't block the consumer
        }
    }
}
