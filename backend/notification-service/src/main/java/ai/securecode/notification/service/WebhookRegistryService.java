package ai.securecode.notification.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class WebhookRegistryService {

    private static final Logger log = LoggerFactory.getLogger(WebhookRegistryService.class);

    private final Map<UUID, List<WebhookConfig>> registry = new ConcurrentHashMap<>();

    public WebhookConfig register(UUID orgId, String url, List<String> eventTypes, String secret) {
        WebhookConfig config = new WebhookConfig(
                UUID.randomUUID(), orgId, url, eventTypes, secret, true
        );
        registry.computeIfAbsent(orgId, k -> new CopyOnWriteArrayList<>()).add(config);
        log.info("Registered webhook {} for org {} events {}", config.id(), orgId, eventTypes);
        return config;
    }

    public List<WebhookConfig> listByOrg(UUID orgId) {
        return registry.getOrDefault(orgId, List.of());
    }

    public void unregister(UUID orgId, UUID webhookId) {
        List<WebhookConfig> hooks = registry.get(orgId);
        if (hooks != null) {
            hooks.removeIf(h -> h.id().equals(webhookId));
        }
    }

    public List<WebhookConfig> findMatching(UUID orgId, String eventType) {
        return registry.getOrDefault(orgId, List.of()).stream()
                .filter(h -> h.active() && (h.eventTypes() == null || h.eventTypes().isEmpty()
                        || h.eventTypes().contains(eventType) || h.eventTypes().contains("*")))
                .toList();
    }

    public record WebhookConfig(
            UUID id,
            UUID orgId,
            String url,
            List<String> eventTypes,
            String secret,
            boolean active
    ) {}
}
