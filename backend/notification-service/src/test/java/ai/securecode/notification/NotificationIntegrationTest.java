package ai.securecode.notification;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class NotificationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ai.securecode.notification.service.EmailService emailService;

    @MockBean
    private ai.securecode.notification.service.WebhookRegistryService webhookRegistry;

    @Test
    void sendEmail_validRequest_returns204() throws Exception {
        var req = new ai.securecode.notification.dto.SendEmailRequest(
                "test@example.com", "Subject", "<p>Body</p>", true);

        doNothing().when(emailService).sendEmail(any());

        mockMvc.perform(post("/api/v1/notifications/email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isNoContent());
    }

    @Test
    void sendEmail_blankTo_returns400() throws Exception {
        var req = new ai.securecode.notification.dto.SendEmailRequest(
                "", "Subject", "Body", false);

        mockMvc.perform(post("/api/v1/notifications/email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void sendInvite_returns204() throws Exception {
        doNothing().when(emailService).sendAssessmentInvite(anyString(), anyString(), anyString(), anyString());

        mockMvc.perform(post("/api/v1/notifications/email/invite")
                        .param("to", "candidate@example.com")
                        .param("candidateName", "John")
                        .param("assessmentLink", "http://localhost/test")
                        .param("orgName", "TestOrg"))
                .andExpect(status().isNoContent());
    }

    @Test
    void sendResult_returns204() throws Exception {
        doNothing().when(emailService).sendResultNotification(anyString(), anyString(), anyString(), anyString());

        mockMvc.perform(post("/api/v1/notifications/email/result")
                        .param("to", "candidate@example.com")
                        .param("candidateName", "John")
                        .param("status", "PASSED")
                        .param("orgName", "TestOrg"))
                .andExpect(status().isNoContent());
    }

    @Test
    void registerWebhook_returns201() throws Exception {
        UUID orgId = UUID.randomUUID();
        var webhookConfig = new ai.securecode.notification.service.WebhookRegistryService.WebhookConfig(
                UUID.randomUUID(), orgId, "https://example.com/hook",
                List.of("assessment.started"), null, true);

        when(webhookRegistry.register(eq(orgId), anyString(), anyList(), anyString()))
                .thenReturn(webhookConfig);

        var req = new ai.securecode.notification.controller.NotificationController.RegisterWebhookRequest(
                "https://example.com/hook", List.of("assessment.started"), "secret");

        mockMvc.perform(post("/api/v1/notifications/webhooks")
                        .header("X-Org-Id", orgId.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.url").value("https://example.com/hook"))
                .andExpect(jsonPath("$.active").value(true));
    }

    @Test
    void listWebhooks_returns200() throws Exception {
        UUID orgId = UUID.randomUUID();
        when(webhookRegistry.listByOrg(orgId)).thenReturn(List.of());

        mockMvc.perform(get("/api/v1/notifications/webhooks")
                        .header("X-Org-Id", orgId.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void unregisterWebhook_returns204() throws Exception {
        UUID orgId = UUID.randomUUID();
        UUID webhookId = UUID.randomUUID();
        doNothing().when(webhookRegistry).unregister(orgId, webhookId);

        mockMvc.perform(delete("/api/v1/notifications/webhooks/" + webhookId)
                        .header("X-Org-Id", orgId.toString()))
                .andExpect(status().isNoContent());
    }
}
