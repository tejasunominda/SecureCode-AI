package ai.securecode.identity.controller;

import ai.securecode.identity.dto.*;
import ai.securecode.identity.security.JwtService;
import ai.securecode.identity.service.AuthService;
import io.jsonwebtoken.Claims;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final JwtService jwtService;

    public AuthController(AuthService authService, JwtService jwtService) {
        this.authService = authService;
        this.jwtService = jwtService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest req) {
        return ResponseEntity.ok(authService.register(req));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req) {
        return ResponseEntity.ok(authService.login(req));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@Valid @RequestBody RefreshTokenRequest req) {
        return ResponseEntity.ok(authService.refresh(req));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequest req) {
        authService.forgotPassword(req);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest req) {
        authService.resetPassword(req);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestBody(required = false) RefreshTokenRequest req) {
        if (req != null && req.refreshToken() != null) {
            authService.logout(req.refreshToken());
        }
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/change-password")
    public ResponseEntity<Void> changePassword(
            @RequestHeader("Authorization") String authHeader,
            @Valid @RequestBody ChangePasswordRequest req) {
        String token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : authHeader;
        Claims claims = jwtService.parseToken(token);
        UUID userId = UUID.fromString(claims.getSubject());
        authService.changePassword(userId, req);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/mfa/setup")
    public ResponseEntity<MfaSetupResponse> setupMfa(
            @RequestHeader("Authorization") String authHeader) {
        UUID userId = extractUserId(authHeader);
        return ResponseEntity.ok(authService.setupMfa(userId));
    }

    @PostMapping("/mfa/enable")
    public ResponseEntity<Void> enableMfa(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody MfaEnableRequest req) {
        UUID userId = extractUserId(authHeader);
        authService.enableMfa(userId, req.code());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/mfa/disable")
    public ResponseEntity<Void> disableMfa(
            @RequestHeader("Authorization") String authHeader) {
        UUID userId = extractUserId(authHeader);
        authService.disableMfa(userId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/mfa/verify")
    public ResponseEntity<AuthResponse> verifyMfa(@Valid @RequestBody MfaVerifyRequest req) {
        return ResponseEntity.ok(authService.verifyMfa(req));
    }

    private UUID extractUserId(String authHeader) {
        String token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : authHeader;
        Claims claims = jwtService.parseToken(token);
        return UUID.fromString(claims.getSubject());
    }
}
