package ai.securecode.notification.controller;

import ai.securecode.notification.dto.SendEmailRequest;
import ai.securecode.notification.service.EmailService;
import ai.securecode.notification.service.WebhookRegistryService;
import ai.securecode.notification.service.WebhookRegistryService.WebhookConfig;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    private final EmailService emailService;
    private final WebhookRegistryService webhookRegistry;

    public NotificationController(EmailService emailService, WebhookRegistryService webhookRegistry) {
        this.emailService = emailService;
        this.webhookRegistry = webhookRegistry;
    }

    @PostMapping("/email")
    public ResponseEntity<Void> sendEmail(@Valid @RequestBody SendEmailRequest req) {
        emailService.sendEmail(req);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/email/invite")
    public ResponseEntity<Void> sendInvite(
            @RequestParam String to,
            @RequestParam String candidateName,
            @RequestParam String assessmentLink,
            @RequestParam String orgName) {
        emailService.sendAssessmentInvite(to, candidateName, assessmentLink, orgName);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/email/result")
    public ResponseEntity<Void> sendResult(
            @RequestParam String to,
            @RequestParam String candidateName,
            @RequestParam String status,
            @RequestParam String orgName) {
        emailService.sendResultNotification(to, candidateName, status, orgName);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/webhooks")
    public ResponseEntity<WebhookConfig> registerWebhook(
            @RequestHeader("X-Org-Id") UUID orgId,
            @RequestBody RegisterWebhookRequest req) {
        WebhookConfig config = webhookRegistry.register(orgId, req.url(), req.eventTypes(), req.secret());
        return ResponseEntity.status(HttpStatus.CREATED).body(config);
    }

    @GetMapping("/webhooks")
    public ResponseEntity<List<WebhookConfig>> listWebhooks(@RequestHeader("X-Org-Id") UUID orgId) {
        return ResponseEntity.ok(webhookRegistry.listByOrg(orgId));
    }

    @DeleteMapping("/webhooks/{webhookId}")
    public ResponseEntity<Void> unregisterWebhook(
            @RequestHeader("X-Org-Id") UUID orgId,
            @PathVariable UUID webhookId) {
        webhookRegistry.unregister(orgId, webhookId);
        return ResponseEntity.noContent().build();
    }

    public record RegisterWebhookRequest(
            @NotBlank String url,
            List<String> eventTypes,
            String secret
    ) {}
}
