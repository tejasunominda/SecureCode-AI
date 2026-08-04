package ai.securecode.identity.service;

import ai.securecode.common.exception.ApiException;
import ai.securecode.identity.config.Argon2PasswordEncoder;
import ai.securecode.identity.dto.*;
import ai.securecode.identity.entity.*;
import ai.securecode.identity.repository.*;
import ai.securecode.identity.security.JwtService;
import io.jsonwebtoken.Claims;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class AuthService {

    private final OrganizationRepository orgRepo;
    private final AppUserRepository userRepo;
    private final RoleRepository roleRepo;
    private final UserRoleRepository userRoleRepo;
    private final Argon2PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(OrganizationRepository orgRepo,
                       AppUserRepository userRepo,
                       RoleRepository roleRepo,
                       UserRoleRepository userRoleRepo,
                       Argon2PasswordEncoder passwordEncoder,
                       JwtService jwtService) {
        this.orgRepo = orgRepo;
        this.userRepo = userRepo;
        this.roleRepo = roleRepo;
        this.userRoleRepo = userRoleRepo;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public AuthResponse register(RegisterRequest req) {
        var org = new Organization();
        org.setName(req.orgName());
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

        return new AuthResponse(
                accessToken, refreshToken, "Bearer",
                jwtService.getAccessTokenTtlSeconds(),
                user.getId(), org.getId(), user.getEmail(), roles
        );
    }

    public AuthResponse login(LoginRequest req) {
        AppUser user = userRepo.findByOrgIdAndEmailAndDeletedAtIsNull(req.orgId(), req.email())
                .orElseThrow(() -> new ApiException("INVALID_CREDENTIALS", HttpStatus.UNAUTHORIZED, "Invalid email or password"));

        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new ApiException("INVALID_CREDENTIALS", HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        if (!"active".equals(user.getStatus())) {
            throw new ApiException("ACCOUNT_DISABLED", HttpStatus.FORBIDDEN, "Account is disabled");
        }

        List<String> roles = userRoleRepo.findRoleCodesByUserId(user.getId());

        String accessToken = jwtService.generateAccessToken(user.getId(), user.getOrgId(), user.getEmail(), roles);
        String refreshToken = jwtService.generateRefreshToken(user.getId(), user.getOrgId());

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
}
