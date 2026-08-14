package ai.securecode.identity.service;

import ai.securecode.common.exception.ApiException;
import ai.securecode.identity.dto.AuthResponse;
import ai.securecode.identity.entity.AppUser;
import ai.securecode.identity.entity.Organization;
import ai.securecode.identity.entity.Role;
import ai.securecode.identity.entity.UserRole;
import ai.securecode.identity.repository.*;
import ai.securecode.identity.security.JwtService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Transactional
public class SsoService {

    private final AppUserRepository userRepo;
    private final OrganizationRepository orgRepo;
    private final RoleRepository roleRepo;
    private final UserRoleRepository userRoleRepo;
    private final JwtService jwtService;
    private final AuditLogService auditLogService;
    private final RestTemplate restTemplate;
    private final SecureRandom secureRandom = new SecureRandom();
    private final ConcurrentHashMap<String, Long> stateStore = new ConcurrentHashMap<>();
    private static final long STATE_TTL_MS = 10 * 60 * 1000;

    @Value("${sso.google.client-id:}")
    private String googleClientId;

    @Value("${sso.google.client-secret:}")
    private String googleClientSecret;

    @Value("${sso.google.redirect-uri:http://localhost:5175/login?provider=google}")
    private String googleRedirectUri;

    @Value("${sso.azure.client-id:}")
    private String azureClientId;

    @Value("${sso.azure.client-secret:}")
    private String azureClientSecret;

    @Value("${sso.azure.redirect-uri:http://localhost:5175/login?provider=azure}")
    private String azureRedirectUri;

    @Value("${sso.azure.tenant-id:}")
    private String azureTenantId;

    public SsoService(AppUserRepository userRepo,
                      OrganizationRepository orgRepo,
                      RoleRepository roleRepo,
                      UserRoleRepository userRoleRepo,
                      JwtService jwtService,
                      AuditLogService auditLogService) {
        this.userRepo = userRepo;
        this.orgRepo = orgRepo;
        this.roleRepo = roleRepo;
        this.userRoleRepo = userRoleRepo;
        this.jwtService = jwtService;
        this.auditLogService = auditLogService;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10_000);
        factory.setReadTimeout(15_000);
        this.restTemplate = new RestTemplate(factory);
    }

    public Map<String, Object> listProviders() {
        return Map.of(
                "google", Map.of(
                        "enabled", !googleClientId.isBlank(),
                        "authUrl", "https://accounts.google.com/o/oauth2/v2/auth"
                ),
                "azure", Map.of(
                        "enabled", !azureClientId.isBlank(),
                        "authUrl", "https://login.microsoftonline.com/" + azureTenantId + "/oauth2/v2.0/authorize"
                ),
                "saml", Map.of(
                        "enabled", true,
                        "metadataUrl", "/api/v1/auth/sso/saml/metadata"
                )
        );
    }

    public String initiateSso(String provider, UUID orgId) {
        return switch (provider.toLowerCase()) {
            case "google" -> buildGoogleAuthUrl(orgId);
            case "azure", "azure-ad", "microsoft" -> buildAzureAuthUrl(orgId);
            case "saml" -> "/api/v1/auth/sso/saml/metadata?orgId=" + orgId;
            default -> throw new ApiException("UNSUPPORTED_SSO_PROVIDER", HttpStatus.BAD_REQUEST,
                    "Unsupported SSO provider: " + provider);
        };
    }

    private String generateState(UUID orgId) {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        String nonce = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        String state = orgId.toString() + ":" + nonce;
        stateStore.put(state, System.currentTimeMillis());
        return state;
    }

    private void validateState(String state) {
        if (state == null || state.isBlank()) {
            throw new ApiException("SSO_STATE_MISSING", HttpStatus.BAD_REQUEST,
                    "Missing state parameter in SSO callback");
        }
        Long timestamp = stateStore.remove(state);
        if (timestamp == null) {
            throw new ApiException("SSO_STATE_INVALID", HttpStatus.BAD_REQUEST,
                    "Invalid or expired state parameter");
        }
        if (System.currentTimeMillis() - timestamp > STATE_TTL_MS) {
            throw new ApiException("SSO_STATE_EXPIRED", HttpStatus.BAD_REQUEST,
                    "State parameter has expired");
        }
    }

    private void cleanupExpiredStates() {
        long now = System.currentTimeMillis();
        stateStore.entrySet().removeIf(e -> now - e.getValue() > STATE_TTL_MS);
    }

    private String buildGoogleAuthUrl(UUID orgId) {
        cleanupExpiredStates();
        String state = generateState(orgId);
        return "https://accounts.google.com/o/oauth2/v2/auth?" +
                "client_id=" + googleClientId +
                "&redirect_uri=" + URLEncoder.encode(googleRedirectUri, StandardCharsets.UTF_8) +
                "&response_type=code" +
                "&scope=" + URLEncoder.encode("openid email profile", StandardCharsets.UTF_8) +
                "&state=" + URLEncoder.encode(state, StandardCharsets.UTF_8);
    }

    private String buildAzureAuthUrl(UUID orgId) {
        cleanupExpiredStates();
        String state = generateState(orgId);
        return "https://login.microsoftonline.com/" + azureTenantId + "/oauth2/v2.0/authorize?" +
                "client_id=" + azureClientId +
                "&redirect_uri=" + URLEncoder.encode(azureRedirectUri, StandardCharsets.UTF_8) +
                "&response_type=code" +
                "&scope=" + URLEncoder.encode("openid email profile User.Read", StandardCharsets.UTF_8) +
                "&state=" + URLEncoder.encode(state, StandardCharsets.UTF_8);
    }

    @SuppressWarnings("unchecked")
    public AuthResponse handleCallback(String provider, String code, String state, UUID orgId) {
        validateState(state);

        String email = switch (provider.toLowerCase()) {
            case "google" -> exchangeGoogleCode(code);
            case "azure", "azure-ad", "microsoft" -> exchangeAzureCode(code);
            default -> throw new ApiException("UNSUPPORTED_SSO_PROVIDER", HttpStatus.BAD_REQUEST,
                    "Unsupported SSO provider: " + provider);
        };

        return provisionSsoUser(email, orgId, provider);
    }

    @SuppressWarnings("unchecked")
    private String exchangeGoogleCode(String code) {
        String tokenUrl = "https://oauth2.googleapis.com/token";
        Map<String, String> tokenReq = Map.of(
                "client_id", googleClientId,
                "client_secret", googleClientSecret,
                "code", code,
                "grant_type", "authorization_code",
                "redirect_uri", googleRedirectUri
        );

        Map<String, Object> tokenResp;
        try {
            tokenResp = restTemplate.postForObject(tokenUrl, tokenReq, Map.class);
        } catch (RestClientException e) {
            throw new ApiException("SSO_TOKEN_EXCHANGE_FAILED", HttpStatus.UNAUTHORIZED,
                    "Failed to contact Google for token exchange: " + e.getMessage());
        }
        if (tokenResp == null || tokenResp.get("access_token") == null) {
            throw new ApiException("SSO_TOKEN_EXCHANGE_FAILED", HttpStatus.UNAUTHORIZED,
                    "Failed to exchange authorization code for access token");
        }

        String accessToken = (String) tokenResp.get("access_token");
        Map<String, Object> userInfo;
        try {
            userInfo = restTemplate.getForObject(
                "https://www.googleapis.com/oauth2/v3/userinfo?access_token=" + accessToken,
                Map.class);
        } catch (RestClientException e) {
            throw new ApiException("SSO_USER_INFO_FAILED", HttpStatus.UNAUTHORIZED,
                    "Failed to retrieve user info from Google: " + e.getMessage());
        }

        if (userInfo == null || userInfo.get("email") == null) {
            throw new ApiException("SSO_USER_INFO_FAILED", HttpStatus.UNAUTHORIZED,
                    "Failed to retrieve user info from provider");
        }

        return (String) userInfo.get("email");
    }

    @SuppressWarnings("unchecked")
    private String exchangeAzureCode(String code) {
        String tokenUrl = "https://login.microsoftonline.com/" + azureTenantId + "/oauth2/v2.0/token";
        Map<String, String> tokenReq = Map.of(
                "client_id", azureClientId,
                "client_secret", azureClientSecret,
                "code", code,
                "grant_type", "authorization_code",
                "redirect_uri", azureRedirectUri,
                "scope", "openid email profile User.Read"
        );

        Map<String, Object> tokenResp;
        try {
            tokenResp = restTemplate.postForObject(tokenUrl, tokenReq, Map.class);
        } catch (RestClientException e) {
            throw new ApiException("SSO_TOKEN_EXCHANGE_FAILED", HttpStatus.UNAUTHORIZED,
                    "Failed to contact Azure for token exchange: " + e.getMessage());
        }
        if (tokenResp == null || tokenResp.get("access_token") == null) {
            throw new ApiException("SSO_TOKEN_EXCHANGE_FAILED", HttpStatus.UNAUTHORIZED,
                    "Failed to exchange authorization code for access token");
        }

        String accessToken = (String) tokenResp.get("access_token");
        Map<String, Object> userInfo;
        try {
            userInfo = restTemplate.getForObject(
                "https://graph.microsoft.com/v1.0/me",
                Map.class);
        } catch (RestClientException e) {
            throw new ApiException("SSO_USER_INFO_FAILED", HttpStatus.UNAUTHORIZED,
                    "Failed to retrieve user info from Azure: " + e.getMessage());
        }

        if (userInfo == null || userInfo.get("userPrincipalName") == null) {
            throw new ApiException("SSO_USER_INFO_FAILED", HttpStatus.UNAUTHORIZED,
                    "Failed to retrieve user info from provider");
        }

        return (String) userInfo.get("userPrincipalName");
    }

    private AuthResponse provisionSsoUser(String email, UUID orgId, String provider) {
        Organization org = orgRepo.findById(orgId)
                .orElseThrow(() -> new ApiException("ORG_NOT_FOUND", HttpStatus.NOT_FOUND, "Organization not found"));

        AppUser user = userRepo.findByOrgIdAndEmailAndDeletedAtIsNull(orgId, email)
                .orElseGet(() -> {
                    AppUser newUser = new AppUser();
                    newUser.setOrgId(orgId);
                    newUser.setEmail(email);
                    newUser.setPasswordHash(null);
                    newUser.setStatus("active");
                    return userRepo.save(newUser);
                });

        List<String> roles = userRoleRepo.findRoleCodesByUserId(user.getId());
        if (roles.isEmpty()) {
            Role candidateRole = roleRepo.findByCode("CANDIDATE");
            if (candidateRole != null) {
                UserRole ur = new UserRole();
                ur.setUserId(user.getId());
                ur.setRoleId(candidateRole.getId());
                ur.setOrgId(orgId);
                userRoleRepo.save(ur);
                roles = List.of("CANDIDATE");
            }
        }

        String accessToken = jwtService.generateAccessToken(user.getId(), orgId, user.getEmail(), roles);
        String refreshToken = jwtService.generateRefreshToken(user.getId(), orgId);

        auditLogService.log(orgId, user.getId(), "SSO_LOGIN_" + provider.toUpperCase(), "app_user", user.getId());

        return new AuthResponse(
                accessToken, refreshToken, "Bearer",
                jwtService.getAccessTokenTtlSeconds(),
                user.getId(), orgId, user.getEmail(), roles
        );
    }

    public Map<String, Object> getSamlMetadata(UUID orgId) {
        String entityId = "https://securecode.ai/saml/" + orgId;
        String acsUrl = "https://securecode.ai/api/v1/auth/sso/saml/acs";
        return Map.of(
                "entityId", entityId,
                "assertionConsumerServiceUrl", acsUrl,
                "binding", "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST",
                "nameIdFormat", "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
                "orgId", orgId.toString()
        );
    }
}
