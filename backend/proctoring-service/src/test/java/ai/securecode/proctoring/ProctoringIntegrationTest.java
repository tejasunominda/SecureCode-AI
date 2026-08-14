package ai.securecode.proctoring;

import ai.securecode.proctoring.entity.ProctoringEvent;
import ai.securecode.proctoring.entity.RiskScoreSnapshot;
import ai.securecode.proctoring.repository.ProctoringEventRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ProctoringIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ProctoringEventRepository eventRepo;

    @MockBean
    private ai.securecode.proctoring.service.RecordingStorageService recordingStorageService;

    private UUID sessionId;

    @BeforeEach
    void setUp() {
        sessionId = UUID.randomUUID();
    }

    @Test
    void getEvents_emptySession_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/proctoring/sessions/" + sessionId + "/events"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void getEvents_afterRecording_returnsEvents() throws Exception {
        // Save an event directly via repository
        ProctoringEvent event = new ProctoringEvent();
        event.setId(UUID.randomUUID());
        event.setSessionId(sessionId);
        event.setEventType("FACE_LOST");
        event.setOccurredAt(Instant.now());
        event.setSource("browser");
        event.setSeverity((short) 2);
        eventRepo.save(event);

        mockMvc.perform(get("/api/v1/proctoring/sessions/" + sessionId + "/events"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].eventType").value("FACE_LOST"));
    }

    @Test
    void getRiskScore_emptySession_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/proctoring/sessions/" + sessionId + "/risk-score"))
                .andExpect(status().isOk());
    }

    @Test
    void recomputeRiskScore_returns200() throws Exception {
        mockMvc.perform(post("/api/v1/proctoring/sessions/" + sessionId + "/risk-score/recompute"))
                .andExpect(status().isOk());
    }

    @Test
    void getAlertEvaluation_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/proctoring/sessions/" + sessionId + "/alert"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.level").exists())
                .andExpect(jsonPath("$.currentScore").exists());
    }

    @Test
    void getAlertThresholds_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/proctoring/alert-thresholds"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.warning").exists())
                .andExpect(jsonPath("$.critical").exists())
                .andExpect(jsonPath("$.termination").exists());
    }

    @Test
    void getPendingReviews_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/proctoring/sessions/" + sessionId + "/pending-reviews"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void getReviewSummary_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/proctoring/sessions/" + sessionId + "/review-summary"))
                .andExpect(status().isOk());
    }

    @Test
    void reviewViolation_returns200() throws Exception {
        // Save an event first
        ProctoringEvent event = new ProctoringEvent();
        event.setId(UUID.randomUUID());
        event.setSessionId(sessionId);
        event.setEventType("TAB_SWITCH");
        event.setOccurredAt(Instant.now());
        event.setSource("browser");
        event.setSeverity((short) 2);
        eventRepo.save(event);

        var body = java.util.Map.of(
                "sessionId", sessionId.toString(),
                "decision", "CONFIRMED",
                "notes", "Confirmed violation"
        );

        mockMvc.perform(post("/api/v1/proctoring/events/" + event.getId() + "/review")
                        .header("X-User-Id", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.decision").value("CONFIRMED"));
    }
}
