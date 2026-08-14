package ai.securecode.identity.service;

import ai.securecode.common.exception.ApiException;
import ai.securecode.identity.repository.*;
import ai.securecode.identity.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;

class SsoServiceStateTest {

    private SsoService ssoService;

    @BeforeEach
    void setUp() {
        ssoService = new SsoService(
                mock(AppUserRepository.class),
                mock(OrganizationRepository.class),
                mock(RoleRepository.class),
                mock(UserRoleRepository.class),
                mock(JwtService.class),
                mock(AuditLogService.class)
        );
        ReflectionTestUtils.setField(ssoService, "googleClientId", "test-google-id");
        ReflectionTestUtils.setField(ssoService, "googleClientSecret", "test-google-secret");
        ReflectionTestUtils.setField(ssoService, "googleRedirectUri", "http://localhost:5175/login?provider=google");
        ReflectionTestUtils.setField(ssoService, "azureClientId", "test-azure-id");
        ReflectionTestUtils.setField(ssoService, "azureClientSecret", "test-azure-secret");
        ReflectionTestUtils.setField(ssoService, "azureRedirectUri", "http://localhost:5175/login?provider=azure");
        ReflectionTestUtils.setField(ssoService, "azureTenantId", "common");
    }

    @Test
    void handleCallback_nullState_throwsBadRequest() {
        ApiException ex = assertThrows(ApiException.class, () ->
                ssoService.handleCallback("google", "somecode", null, UUID.randomUUID()));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertTrue(ex.getMessage().toLowerCase().contains("state"));
    }

    @Test
    void handleCallback_emptyState_throwsBadRequest() {
        ApiException ex = assertThrows(ApiException.class, () ->
                ssoService.handleCallback("google", "somecode", "", UUID.randomUUID()));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
    }

    @Test
    void handleCallback_invalidState_throwsBadRequest() {
        ApiException ex = assertThrows(ApiException.class, () ->
                ssoService.handleCallback("google", "somecode", "invalid-state-not-in-store", UUID.randomUUID()));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertTrue(ex.getMessage().toLowerCase().contains("invalid"));
    }

    @Test
    void handleCallback_unsupportedProvider_throwsBadRequest() {
        UUID orgId = UUID.randomUUID();
        String initiateUrl = ssoService.initiateSso("google", orgId);
        assertNotNull(initiateUrl);
        assertTrue(initiateUrl.contains("state="));

        String state = java.net.URLDecoder.decode(
                initiateUrl.substring(initiateUrl.indexOf("state=") + 6),
                java.nio.charset.StandardCharsets.UTF_8);
        ApiException ex = assertThrows(ApiException.class, () ->
                ssoService.handleCallback("facebook", "code", state, orgId));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertTrue(ex.getMessage().toLowerCase().contains("provider"));
    }

    @Test
    void initiateSso_google_returnsUrlWithState() {
        String url = ssoService.initiateSso("google", UUID.randomUUID());
        assertNotNull(url);
        assertTrue(url.contains("accounts.google.com"));
        assertTrue(url.contains("state="));
    }

    @Test
    void initiateSso_azure_returnsUrlWithState() {
        String url = ssoService.initiateSso("azure", UUID.randomUUID());
        assertNotNull(url);
        assertTrue(url.contains("login.microsoftonline.com"));
        assertTrue(url.contains("state="));
    }

    @Test
    void initiateSso_unsupportedProvider_throws() {
        assertThrows(ApiException.class, () ->
                ssoService.initiateSso("facebook", UUID.randomUUID()));
    }

    @Test
    void listProviders_returnsAllThree() {
        var providers = ssoService.listProviders();
        assertNotNull(providers);
        assertTrue(providers.containsKey("google"));
        assertTrue(providers.containsKey("azure"));
        assertTrue(providers.containsKey("saml"));
    }
}
