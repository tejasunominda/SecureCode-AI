package ai.securecode.proctoring.service;

import ai.securecode.proctoring.entity.ProctoringEvent;
import ai.securecode.proctoring.entity.RiskScoreSnapshot;
import ai.securecode.proctoring.repository.ProctoringEventRepository;
import ai.securecode.proctoring.repository.RiskScoreSnapshotRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class RiskScoringEngine {

    private final ProctoringEventRepository eventRepo;
    private final RiskScoreSnapshotRepository snapshotRepo;

    @Value("${risk-engine.half-life-minutes:10}")
    private int halfLifeMinutes;

    private static final Map<String, Integer> EVENT_WEIGHTS = Map.ofEntries(
            Map.entry("face_lost", 10),
            Map.entry("multi_face", 25),
            Map.entry("tab_switch", 15),
            Map.entry("fullscreen_exit", 10),
            Map.entry("copy_paste", 20),
            Map.entry("right_click", 5),
            Map.entry("devtools_detected", 30),
            Map.entry("idle_timeout", 5),
            Map.entry("phone_detected", 25),
            Map.entry("gaze_away", 5),
            Map.entry("voice_detected", 5)
    );

    private static final Map<String, Integer> EVENT_SEVERITY = Map.ofEntries(
            Map.entry("face_lost", 2),
            Map.entry("multi_face", 3),
            Map.entry("tab_switch", 2),
            Map.entry("fullscreen_exit", 1),
            Map.entry("copy_paste", 3),
            Map.entry("right_click", 1),
            Map.entry("devtools_detected", 3),
            Map.entry("idle_timeout", 1),
            Map.entry("phone_detected", 3),
            Map.entry("gaze_away", 1),
            Map.entry("voice_detected", 1)
    );

    public RiskScoringEngine(ProctoringEventRepository eventRepo,
                             RiskScoreSnapshotRepository snapshotRepo) {
        this.eventRepo = eventRepo;
        this.snapshotRepo = snapshotRepo;
    }

    public RiskScoreSnapshot recomputeScore(UUID sessionId) {
        List<ProctoringEvent> events = eventRepo.findBySessionIdOrderByOccurredAtAsc(sessionId);
        Instant now = Instant.now();
        double halfLifeSeconds = halfLifeMinutes * 60.0;
        double score = 0;

        for (ProctoringEvent event : events) {
            int weight = EVENT_WEIGHTS.getOrDefault(event.getEventType(), 5);
            int severity = EVENT_SEVERITY.getOrDefault(event.getEventType(), 1);
            long ageSeconds = Duration.between(event.getOccurredAt(), now).getSeconds();
            double decay = Math.exp(-ageSeconds / halfLifeSeconds);
            score += severity * weight * decay;
        }

        score = Math.min(100, Math.max(0, score));

        RiskScoreSnapshot snapshot = snapshotRepo.findById(sessionId).orElse(new RiskScoreSnapshot());
        snapshot.setSessionId(sessionId);
        snapshot.setScore(BigDecimal.valueOf(score).setScale(2, RoundingMode.HALF_UP));
        snapshot.setLastEventAt(events.isEmpty() ? null : events.get(events.size() - 1).getOccurredAt());
        snapshot.setUpdatedAt(now);
        return snapshotRepo.save(snapshot);
    }

    public RiskScoreSnapshot getScore(UUID sessionId) {
        return snapshotRepo.findById(sessionId)
                .orElseGet(() -> {
                    RiskScoreSnapshot s = new RiskScoreSnapshot();
                    s.setSessionId(sessionId);
                    s.setScore(BigDecimal.ZERO);
                    return s;
                });
    }
}
