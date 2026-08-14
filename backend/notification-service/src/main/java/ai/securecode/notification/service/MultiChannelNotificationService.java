package ai.securecode.notification.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/**
 * Multi-channel notification dispatcher (FR-NOTIF-01..05).
 * Supports SMS (Twilio), push (FCM), Slack/Teams webhooks, and generic webhooks.
 */
@Service
public class MultiChannelNotificationService {

    private static final Logger log = LoggerFactory.getLogger(MultiChannelNotificationService.class);

    @Value("${notification.sms.enabled:false}")
    private boolean smsEnabled;

    @Value("${notification.sms.twilio-account-sid:}")
    private String twilioAccountSid;

    @Value("${notification.sms.twilio-auth-token:}")
    private String twilioAuthToken;

    @Value("${notification.sms.twilio-from-number:}")
    private String twilioFromNumber;

    @Value("${notification.push.enabled:false}")
    private boolean pushEnabled;

    @Value("${notification.push.fcm-server-key:}")
    private String fcmServerKey;

    @Value("${notification.slack.webhook-url:}")
    private String slackWebhookUrl;

    @Value("${notification.teams.webhook-url:}")
    private String teamsWebhookUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    public void sendSms(String toPhoneNumber, String message) {
        if (!smsEnabled) {
            log.debug("SMS disabled, skipping send to {}", toPhoneNumber);
            return;
        }
        try {
            String url = "https://api.twilio.com/2010-04-01/Accounts/" + twilioAccountSid + "/Messages.json";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            headers.setBasicAuth(twilioAccountSid, twilioAuthToken);

            String body = "From=" + twilioFromNumber + "&To=" + toPhoneNumber + "&Body=" + message;
            HttpEntity<String> request = new HttpEntity<>(body, headers);
            restTemplate.postForObject(url, request, String.class);
            log.info("SMS sent to {}", toPhoneNumber);
        } catch (Exception e) {
            log.error("Failed to send SMS to {}: {}", toPhoneNumber, e.getMessage());
        }
    }

    public void sendPushNotification(String deviceToken, String title, String body) {
        if (!pushEnabled) {
            log.debug("Push notifications disabled, skipping send to token {}", deviceToken);
            return;
        }
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "key=" + fcmServerKey);

            Map<String, Object> payload = Map.of(
                    "to", deviceToken,
                    "notification", Map.of("title", title, "body", body),
                    "data", Map.of("click_action", "FLUTTER_NOTIFICATION_CLICK")
            );

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
            restTemplate.postForObject("https://fcm.googleapis.com/fcm/send", request, String.class);
            log.info("Push notification sent to token {}", deviceToken);
        } catch (Exception e) {
            log.error("Failed to send push notification: {}", e.getMessage());
        }
    }

    public void sendSlackMessage(String message) {
        if (slackWebhookUrl == null || slackWebhookUrl.isBlank()) {
            log.debug("Slack webhook URL not configured, skipping");
            return;
        }
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            Map<String, String> payload = Map.of("text", message);
            HttpEntity<Map<String, String>> request = new HttpEntity<>(payload, headers);
            restTemplate.postForObject(slackWebhookUrl, request, String.class);
            log.info("Slack message sent");
        } catch (Exception e) {
            log.error("Failed to send Slack message: {}", e.getMessage());
        }
    }

    public void sendTeamsMessage(String title, String message) {
        if (teamsWebhookUrl == null || teamsWebhookUrl.isBlank()) {
            log.debug("Teams webhook URL not configured, skipping");
            return;
        }
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            Map<String, Object> payload = Map.of(
                    "@type", "MessageCard",
                    "@context", "https://schema.org/extensions",
                    "summary", title,
                    "themeColor", "0078D7",
                    "sections", List.of(Map.of(
                            "activityTitle", title,
                            "text", message
                    ))
            );
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
            restTemplate.postForObject(teamsWebhookUrl, request, String.class);
            log.info("Teams message sent");
        } catch (Exception e) {
            log.error("Failed to send Teams message: {}", e.getMessage());
        }
    }

    public void sendWebhook(String webhookUrl, Map<String, Object> payload) {
        if (webhookUrl == null || webhookUrl.isBlank()) {
            log.debug("Webhook URL not provided, skipping");
            return;
        }
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
            restTemplate.postForObject(webhookUrl, request, String.class);
            log.info("Webhook sent to {}", webhookUrl);
        } catch (Exception e) {
            log.error("Failed to send webhook to {}: {}", webhookUrl, e.getMessage());
        }
    }

    public void notifyAllChannels(String email, String phoneNumber, String deviceToken,
                                   String title, String message, Map<String, Object> webhookPayload) {
        if (email != null) {
            log.debug("Email notification queued for {}", email);
        }
        if (phoneNumber != null) {
            sendSms(phoneNumber, title + ": " + message);
        }
        if (deviceToken != null) {
            sendPushNotification(deviceToken, title, message);
        }
        sendSlackMessage("*" + title + "*\n" + message);
        sendTeamsMessage(title, message);
        if (webhookPayload != null && webhookPayload.containsKey("webhookUrl")) {
            String url = (String) webhookPayload.remove("webhookUrl");
            sendWebhook(url, webhookPayload);
        }
    }
}
