package ai.securecode.notification.controller;

import ai.securecode.notification.dto.SendEmailRequest;
import ai.securecode.notification.entity.InAppNotification;
import ai.securecode.notification.repository.InAppNotificationRepository;
import ai.securecode.notification.service.EmailService;
import ai.securecode.notification.service.WebhookRegistryService;
import ai.securecode.notification.service.WebhookRegistryService.WebhookConfig;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    private final EmailService emailService;
    private final WebhookRegistryService webhookRegistry;
    private final InAppNotificationRepository inAppNotificationRepo;

    public NotificationController(EmailService emailService,
                                  WebhookRegistryService webhookRegistry,
                                  InAppNotificationRepository inAppNotificationRepo) {
        this.emailService = emailService;
        this.webhookRegistry = webhookRegistry;
        this.inAppNotificationRepo = inAppNotificationRepo;
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

    @PostMapping("/in-app")
    public ResponseEntity<InAppNotification> createInAppNotification(
            @RequestHeader("X-Org-Id") UUID orgId,
            @Valid @RequestBody CreateInAppNotificationRequest req) {
        InAppNotification notification = new InAppNotification();
        notification.setUserId(req.userId());
        notification.setOrgId(orgId);
        notification.setTitle(req.title());
        notification.setMessage(req.message());
        notification.setType(req.type() != null ? req.type() : "info");
        notification.setLinkUrl(req.linkUrl());
        notification = inAppNotificationRepo.save(notification);
        return ResponseEntity.status(HttpStatus.CREATED).body(notification);
    }

    @GetMapping("/in-app")
    public ResponseEntity<Page<InAppNotification>> listInAppNotifications(
            @RequestHeader("X-User-Id") UUID userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "false") boolean unreadOnly) {
        PageRequest pageable = PageRequest.of(page, size);
        Page<InAppNotification> result = unreadOnly
                ? inAppNotificationRepo.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId, pageable)
                : inAppNotificationRepo.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/in-app/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(@RequestHeader("X-User-Id") UUID userId) {
        return ResponseEntity.ok(Map.of("unreadCount", inAppNotificationRepo.countByUserIdAndIsReadFalse(userId)));
    }

    @PutMapping("/in-app/{notificationId}/read")
    public ResponseEntity<Void> markRead(@PathVariable UUID notificationId) {
        InAppNotification notification = inAppNotificationRepo.findById(notificationId).orElse(null);
        if (notification != null && !notification.isRead()) {
            notification.setRead(true);
            notification.setReadAt(Instant.now());
            inAppNotificationRepo.save(notification);
        }
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/in-app/read-all")
    public ResponseEntity<Void> markAllRead(@RequestHeader("X-User-Id") UUID userId) {
        inAppNotificationRepo.markAllRead(userId);
        return ResponseEntity.noContent().build();
    }

    public record RegisterWebhookRequest(
            @NotBlank String url,
            List<String> eventTypes,
            String secret
    ) {}

    public record CreateInAppNotificationRequest(
            @NotBlank UUID userId,
            @NotBlank String title,
            String message,
            String type,
            String linkUrl
    ) {}
}
