package ai.securecode.identity.controller;

import ai.securecode.identity.dto.AuthResponse;
import ai.securecode.identity.service.SsoService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth/sso")
public class SsoController {

    private final SsoService ssoService;

    public SsoController(SsoService ssoService) {
        this.ssoService = ssoService;
    }

    @GetMapping("/providers")
    public ResponseEntity<Map<String, Object>> listProviders() {
        return ResponseEntity.ok(ssoService.listProviders());
    }

    @PostMapping("/initiate")
    public ResponseEntity<Map<String, String>> initiateSso(@Valid @RequestBody SsoInitiateRequest req) {
        String redirectUrl = ssoService.initiateSso(req.provider(), req.orgId());
        return ResponseEntity.ok(Map.of("redirectUrl", redirectUrl));
    }

    @PostMapping("/callback")
    public ResponseEntity<AuthResponse> handleCallback(@Valid @RequestBody SsoCallbackRequest req) {
        return ResponseEntity.ok(ssoService.handleCallback(req.provider(), req.code(), req.state(), req.orgId()));
    }

    @PostMapping("/saml/metadata")
    public ResponseEntity<Map<String, Object>> getSamlMetadata(@RequestParam UUID orgId) {
        return ResponseEntity.ok(ssoService.getSamlMetadata(orgId));
    }

    public record SsoInitiateRequest(String provider, UUID orgId) {}
    public record SsoCallbackRequest(String provider, String code, String state, UUID orgId) {}
}
