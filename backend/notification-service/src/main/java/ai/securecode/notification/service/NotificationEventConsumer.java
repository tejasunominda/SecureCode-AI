package ai.securecode.notification.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * Kafka consumer that listens for notification events and dispatches them
 * across all configured channels (FR-NOTIF-01..05).
 */
@Service
public class NotificationEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(NotificationEventConsumer.class);

    private final EmailService emailService;
    private final MultiChannelNotificationService multiChannelService;
    private final ObjectMapper objectMapper;

    public NotificationEventConsumer(EmailService emailService,
                                     MultiChannelNotificationService multiChannelService,
                                     ObjectMapper objectMapper) {
        this.emailService = emailService;
        this.multiChannelService = multiChannelService;
        this.objectMapper = objectMapper;
    }

    @KafkaListener(topics = "securecode.notifications", groupId = "notification-service")
    public void handleNotificationEvent(String message) {
        try {
            Map<String, Object> event = objectMapper.readValue(message, Map.class);
            String type = (String) event.get("type");
            String email = (String) event.get("email");
            String phone = (String) event.get("phoneNumber");
            String deviceToken = (String) event.get("deviceToken");
            String title = (String) event.getOrDefault("title", "SecureCode Notification");
            String body = (String) event.getOrDefault("body", "");

            log.info("Processing notification event: type={}, email={}", type, email);

            if (email != null && !email.isBlank()) {
                emailService.sendEmail(new ai.securecode.notification.dto.SendEmailRequest(
                        email, title, body, false));
            }

            multiChannelService.notifyAllChannels(
                    email, phone, deviceToken, title, body,
                    event.containsKey("webhookUrl") ? event : null);

        } catch (Exception e) {
            log.error("Failed to process notification event: {}", e.getMessage(), e);
        }
    }

    @KafkaListener(topics = "securecode.assessment.events", groupId = "notification-service")
    public void handleAssessmentEvent(String message) {
        try {
            Map<String, Object> event = objectMapper.readValue(message, Map.class);
            String eventType = (String) event.get("eventType");
            String email = (String) event.get("candidateEmail");
            String candidateName = (String) event.getOrDefault("candidateName", "Candidate");
            String orgName = (String) event.getOrDefault("orgName", "SecureCode");

            log.info("Processing assessment event: type={}", eventType);

            if ("ASSESSMENT_INVITE".equals(eventType) && email != null) {
                String link = (String) event.getOrDefault("assessmentLink", "");
                emailService.sendAssessmentInvite(email, candidateName, link, orgName);
                multiChannelService.sendSlackMessage(
                        "*New Assessment Invite*\nCandidate: " + candidateName + "\nOrg: " + orgName);
            } else if ("RESULT_PUBLISHED".equals(eventType) && email != null) {
                String status = (String) event.getOrDefault("status", "reviewed");
                emailService.sendResultNotification(email, candidateName, status, orgName);
            }

        } catch (Exception e) {
            log.error("Failed to process assessment event: {}", e.getMessage(), e);
        }
    }
}
