package ai.securecode.notification.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class WebhookRegistryServiceTest {

    private WebhookRegistryService service;
    private UUID orgId;

    @BeforeEach
    void setUp() {
        service = new WebhookRegistryService();
        orgId = UUID.randomUUID();
    }

    @Test
    void register_addsWebhookForOrg() {
        var config = service.register(orgId, "https://example.com/hook",
                List.of("assessment.started"), "secret123");

        assertNotNull(config.id());
        assertEquals(orgId, config.orgId());
        assertEquals("https://example.com/hook", config.url());
        assertTrue(config.active());
    }

    @Test
    void listByOrg_returnsAllWebhooks() {
        service.register(orgId, "https://a.com/hook", List.of("*"), null);
        service.register(orgId, "https://b.com/hook", List.of("assessment.completed"), null);

        var configs = service.listByOrg(orgId);
        assertEquals(2, configs.size());
    }

    @Test
    void listByOrg_returnsEmptyForUnknownOrg() {
        var configs = service.listByOrg(UUID.randomUUID());
        assertTrue(configs.isEmpty());
    }

    @Test
    void unregister_removesWebhook() {
        var config = service.register(orgId, "https://example.com/hook", List.of("*"), null);
        service.unregister(orgId, config.id());

        assertTrue(service.listByOrg(orgId).isEmpty());
    }

    @Test
    void findMatching_returnsWebhooksForEventType() {
        service.register(orgId, "https://a.com/hook", List.of("assessment.started"), null);
        service.register(orgId, "https://b.com/hook", List.of("assessment.completed"), null);
        service.register(orgId, "https://c.com/hook", List.of("*"), null);

        var matches = service.findMatching(orgId, "assessment.started");
        assertEquals(2, matches.size()); // specific match + wildcard
    }

    @Test
    void findMatching_returnsEmptyForNoMatch() {
        service.register(orgId, "https://a.com/hook", List.of("assessment.completed"), null);

        var matches = service.findMatching(orgId, "assessment.started");
        assertTrue(matches.isEmpty());
    }
}
