package ai.securecode.identity.service;

import ai.securecode.common.exception.ApiException;
import ai.securecode.identity.client.NotificationEmailRequest;
import ai.securecode.identity.config.Argon2PasswordEncoder;
import ai.securecode.identity.dto.*;
import ai.securecode.identity.entity.*;
import ai.securecode.identity.repository.*;
import ai.securecode.identity.security.JwtService;
import io.jsonwebtoken.Claims;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import ai.securecode.identity.service.AuditLogService;

@Service
@Transactional
public class AuthService {

    private final OrganizationRepository orgRepo;
    private final AppUserRepository userRepo;
    private final RoleRepository roleRepo;
    private final UserRoleRepository userRoleRepo;
    private final PasswordResetTokenRepository resetTokenRepo;
    private final Argon2PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final PasswordValidator passwordValidator;
    private final AuditLogService auditLogService;
    private final DeviceFingerprintService deviceFingerprintService;
    private final RestTemplate restTemplate;

    @Value("${securecode.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${securecode.notification.url:http://notification-service:8086}")
    private String notificationUrl;

    public AuthService(OrganizationRepository orgRepo,
                       AppUserRepository userRepo,
                       RoleRepository roleRepo,
                       UserRoleRepository userRoleRepo,
                       PasswordResetTokenRepository resetTokenRepo,
                       Argon2PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       PasswordValidator passwordValidator,
                       AuditLogService auditLogService,
                       DeviceFingerprintService deviceFingerprintService,
                       RestTemplate restTemplate) {
        this.orgRepo = orgRepo;
        this.userRepo = userRepo;
        this.roleRepo = roleRepo;
        this.userRoleRepo = userRoleRepo;
        this.resetTokenRepo = resetTokenRepo;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.passwordValidator = passwordValidator;
        this.auditLogService = auditLogService;
        this.deviceFingerprintService = deviceFingerprintService;
        this.restTemplate = restTemplate;
    }

    public AuthResponse register(RegisterRequest req) {
        passwordValidator.validate(req.password());

        var org = new Organization();
        org.setName(req.organizationName());
        org.setStatus("active");
        org = orgRepo.save(org);

        var user = new AppUser();
        user.setOrgId(org.getId());
        user.setEmail(req.email());
        user.setPasswordHash(passwordEncoder.encode(req.password()));
        user.setStatus("active");
        user = userRepo.save(user);

        Role role = roleRepo.findByCode(req.role());
        if (role == null) {
            throw new ApiException("ROLE_NOT_FOUND", HttpStatus.BAD_REQUEST, "Role not found", "role");
        }

        var userRole = new UserRole();
        userRole.setUserId(user.getId());
        userRole.setRoleId(role.getId());
        userRole.setOrgId(org.getId());
        userRoleRepo.save(userRole);

        List<String> roles = List.of(role.getCode());
        String accessToken = jwtService.generateAccessToken(user.getId(), org.getId(), user.getEmail(), roles);
        String refreshToken = jwtService.generateRefreshToken(user.getId(), org.getId());

        auditLogService.log(org.getId(), user.getId(), "USER_REGISTERED", "app_user", user.getId());

        return new AuthResponse(
                accessToken, refreshToken, "Bearer",
                jwtService.getAccessTokenTtlSeconds(),
                user.getId(), org.getId(), user.getEmail(), roles
        );
    }

    public AuthResponse login(LoginRequest req) {
        AppUser user = userRepo.findFirstByEmailAndDeletedAtIsNull(req.email()).orElse(null);
        if (user == null) {
            throw new ApiException("INVALID_CREDENTIALS", HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            auditLogService.log(user.getOrgId(), user.getId(), "LOGIN_FAILED", "app_user", user.getId());
            throw new ApiException("INVALID_CREDENTIALS", HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        if (!"active".equals(user.getStatus())) {
            auditLogService.log(user.getOrgId(), user.getId(), "LOGIN_FAILED_DISABLED", "app_user", user.getId());
            throw new ApiException("ACCOUNT_DISABLED", HttpStatus.FORBIDDEN, "Account is disabled");
        }

        if (user.isMfaEnabled()) {
            String mfaToken = jwtService.generateMfaChallengeToken(user.getId(), user.getOrgId());
            throw new MfaRequiredException(mfaToken);
        }

        List<String> roles = userRoleRepo.findRoleCodesByUserId(user.getId());

        String accessToken = jwtService.generateAccessToken(user.getId(), user.getOrgId(), user.getEmail(), roles);
        String refreshToken = jwtService.generateRefreshToken(user.getId(), user.getOrgId());

        auditLogService.log(user.getOrgId(), user.getId(), "USER_LOGIN", "app_user", user.getId());

        if (req.deviceFingerprint() != null && !req.deviceFingerprint().isBlank()) {
            deviceFingerprintService.recordOrUpdate(
                    user.getId(), user.getOrgId(), req.deviceFingerprint(),
                    req.userAgent(), req.platform(), req.screenResolution(),
                    req.timezone(), req.language());
        }

        return new AuthResponse(
                accessToken, refreshToken, "Bearer",
                jwtService.getAccessTokenTtlSeconds(),
                user.getId(), user.getOrgId(), user.getEmail(), roles
        );
    }

    public AuthResponse refresh(RefreshTokenRequest req) {
        Claims claims;
        try {
            claims = jwtService.parseToken(req.refreshToken());
        } catch (Exception e) {
            throw new ApiException("INVALID_TOKEN", HttpStatus.UNAUTHORIZED, "Invalid or expired token");
        }

        if (!jwtService.isRefreshToken(claims)) {
            throw new ApiException("INVALID_TOKEN", HttpStatus.UNAUTHORIZED, "Invalid or expired token");
        }

        UUID userId = UUID.fromString(claims.getSubject());
        UUID orgId = UUID.fromString(claims.get("org_id", String.class));

        AppUser user = userRepo.findById(userId)
                .orElseThrow(() -> new ApiException("USER_NOT_FOUND", HttpStatus.NOT_FOUND, "User not found"));

        List<String> roles = userRoleRepo.findRoleCodesByUserId(user.getId());

        String accessToken = jwtService.generateAccessToken(user.getId(), orgId, user.getEmail(), roles);
        String refreshToken = jwtService.generateRefreshToken(user.getId(), orgId);

        return new AuthResponse(
                accessToken, refreshToken, "Bearer",
                jwtService.getAccessTokenTtlSeconds(),
                user.getId(), orgId, user.getEmail(), roles
        );
    }

    public void forgotPassword(ForgotPasswordRequest req) {
        AppUser user = userRepo.findFirstByEmailAndDeletedAtIsNull(req.email()).orElse(null);
        if (user == null) return;

        PasswordResetToken token = new PasswordResetToken();
        token.setUserId(user.getId());
        token.setToken(UUID.randomUUID().toString().replace("-", ""));
        token.setExpiresAt(Instant.now().plus(Duration.ofHours(1)));
        resetTokenRepo.save(token);

        String resetLink = frontendUrl + "/reset-password?token=" + token.getToken();
        String body = "Click the link below to reset your SecureCode AI password:\n\n" + resetLink;
        NotificationEmailRequest email = new NotificationEmailRequest(
                user.getEmail(),
                "Reset your SecureCode AI password",
                body,
                false
        );

        try {
            var headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
            var entity = new org.springframework.http.HttpEntity<>(email, headers);
            restTemplate.postForEntity(notificationUrl + "/api/v1/notifications/email", entity, Void.class);
        } catch (Exception e) {
            // If notification service is unavailable, the token is still stored.
            // A real deployment should retry or queue this.
        }
    }

    public void resetPassword(ResetPasswordRequest req) {
        PasswordResetToken token = resetTokenRepo.findByToken(req.token())
                .orElseThrow(() -> new ApiException("INVALID_TOKEN", HttpStatus.BAD_REQUEST, "Invalid or expired reset token"));

        if (token.getUsedAt() != null || token.getExpiresAt().isBefore(Instant.now())) {
            throw new ApiException("INVALID_TOKEN", HttpStatus.BAD_REQUEST, "Invalid or expired reset token");
        }

        passwordValidator.validate(req.newPassword());

        AppUser user = userRepo.findById(token.getUserId())
                .orElseThrow(() -> new ApiException("USER_NOT_FOUND", HttpStatus.NOT_FOUND, "User not found"));
        user.setPasswordHash(passwordEncoder.encode(req.newPassword()));
        user.setUpdatedAt(Instant.now());
        userRepo.save(user);

        token.setUsedAt(Instant.now());
        resetTokenRepo.save(token);

        auditLogService.log(user.getOrgId(), user.getId(), "PASSWORD_RESET", "app_user", user.getId());
    }

    public void changePassword(UUID userId, ChangePasswordRequest req) {
        AppUser user = userRepo.findById(userId)
                .orElseThrow(() -> new ApiException("USER_NOT_FOUND", HttpStatus.NOT_FOUND, "User not found"));

        if (!passwordEncoder.matches(req.currentPassword(), user.getPasswordHash())) {
            throw new ApiException("INVALID_CREDENTIALS", HttpStatus.UNAUTHORIZED, "Current password is incorrect");
        }

        passwordValidator.validate(req.newPassword());

        user.setPasswordHash(passwordEncoder.encode(req.newPassword()));
        user.setUpdatedAt(Instant.now());
        userRepo.save(user);

        auditLogService.log(user.getOrgId(), user.getId(), "PASSWORD_CHANGED", "app_user", user.getId());
    }

    public void logout(String refreshToken) {
        // Stateless JWT — client simply discards tokens.
        // Server-side token blacklist could be added via Redis if needed.
    }

    public MfaSetupResponse setupMfa(UUID userId) {
        AppUser user = userRepo.findById(userId)
                .orElseThrow(() -> new ApiException("USER_NOT_FOUND", HttpStatus.NOT_FOUND, "User not found"));

        String secret = TotpUtil.generateSecret();
        user.setMfaSecret(secret);
        user.setUpdatedAt(Instant.now());
        userRepo.save(user);

        String uri = TotpUtil.generateTotpUri(user.getEmail(), secret);
        return new MfaSetupResponse(secret, uri);
    }

    public void enableMfa(UUID userId, int code) {
        AppUser user = userRepo.findById(userId)
                .orElseThrow(() -> new ApiException("USER_NOT_FOUND", HttpStatus.NOT_FOUND, "User not found"));

        if (user.getMfaSecret() == null) {
            throw new ApiException("MFA_NOT_SETUP", HttpStatus.BAD_REQUEST, "MFA not setup. Call setup first.");
        }

        if (!TotpUtil.verifyCode(user.getMfaSecret(), code)) {
            throw new ApiException("INVALID_MFA_CODE", HttpStatus.UNAUTHORIZED, "Invalid MFA code");
        }

        user.setMfaEnabled(true);
        user.setUpdatedAt(Instant.now());
        userRepo.save(user);

        auditLogService.log(user.getOrgId(), user.getId(), "MFA_ENABLED", "app_user", user.getId());
    }

    public void disableMfa(UUID userId) {
        AppUser user = userRepo.findById(userId)
                .orElseThrow(() -> new ApiException("USER_NOT_FOUND", HttpStatus.NOT_FOUND, "User not found"));

        user.setMfaEnabled(false);
        user.setMfaSecret(null);
        user.setUpdatedAt(Instant.now());
        userRepo.save(user);

        auditLogService.log(user.getOrgId(), user.getId(), "MFA_DISABLED", "app_user", user.getId());
    }

    public AuthResponse verifyMfa(MfaVerifyRequest req) {
        Claims claims;
        try {
            claims = jwtService.parseToken(req.mfaToken());
        } catch (Exception e) {
            throw new ApiException("INVALID_TOKEN", HttpStatus.UNAUTHORIZED, "Invalid or expired MFA challenge token");
        }

        if (!"mfa_challenge".equals(claims.get("type", String.class))) {
            throw new ApiException("INVALID_TOKEN", HttpStatus.UNAUTHORIZED, "Not an MFA challenge token");
        }

        UUID userId = UUID.fromString(claims.getSubject());
        UUID orgId = UUID.fromString(claims.get("org_id", String.class));

        AppUser user = userRepo.findById(userId)
                .orElseThrow(() -> new ApiException("USER_NOT_FOUND", HttpStatus.NOT_FOUND, "User not found"));

        if (!user.isMfaEnabled() || user.getMfaSecret() == null) {
            throw new ApiException("MFA_NOT_ENABLED", HttpStatus.BAD_REQUEST, "MFA not enabled for this user");
        }

        if (!TotpUtil.verifyCode(user.getMfaSecret(), req.code())) {
            throw new ApiException("INVALID_MFA_CODE", HttpStatus.UNAUTHORIZED, "Invalid MFA code");
        }

        List<String> roles = userRoleRepo.findRoleCodesByUserId(user.getId());
        String accessToken = jwtService.generateAccessToken(user.getId(), orgId, user.getEmail(), roles);
        String refreshToken = jwtService.generateRefreshToken(user.getId(), orgId);

        auditLogService.log(orgId, user.getId(), "MFA_VERIFIED", "app_user", user.getId());

        return new AuthResponse(
                accessToken, refreshToken, "Bearer",
                jwtService.getAccessTokenTtlSeconds(),
                user.getId(), orgId, user.getEmail(), roles
        );
    }
}
