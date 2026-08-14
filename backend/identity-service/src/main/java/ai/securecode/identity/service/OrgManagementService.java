package ai.securecode.identity.service;

import ai.securecode.identity.config.Argon2PasswordEncoder;
import ai.securecode.identity.dto.*;
import ai.securecode.identity.entity.*;
import ai.securecode.identity.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class OrgManagementService {

    private final OrganizationRepository orgRepo;
    private final AppUserRepository userRepo;
    private final RoleRepository roleRepo;
    private final UserRoleRepository userRoleRepo;
    private final Argon2PasswordEncoder passwordEncoder;

    public OrgManagementService(OrganizationRepository orgRepo,
                                AppUserRepository userRepo,
                                RoleRepository roleRepo,
                                UserRoleRepository userRoleRepo,
                                Argon2PasswordEncoder passwordEncoder) {
        this.orgRepo = orgRepo;
        this.userRepo = userRepo;
        this.roleRepo = roleRepo;
        this.userRoleRepo = userRoleRepo;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public OrgResponse createOrg(CreateOrgRequest req) {
        Organization org = new Organization();
        org.setName(req.name());
        if (req.tier() != null) org.setTier(req.tier());
        if (req.dataResidency() != null) org.setDataResidency(req.dataResidency());
        if (req.parentOrgId() != null) org.setParentOrgId(req.parentOrgId());
        org = orgRepo.save(org);
        return toOrgResponse(org);
    }

    @Transactional(readOnly = true)
    public OrgResponse getOrg(UUID orgId) {
        Organization org = orgRepo.findById(orgId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Org not found"));
        return toOrgResponse(org);
    }

    @Transactional
    public OrgResponse createSubOrg(UUID parentOrgId, CreateOrgRequest req) {
        Organization parent = orgRepo.findById(parentOrgId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Parent org not found"));
        Organization sub = new Organization();
        sub.setName(req.name());
        sub.setParentOrgId(parent.getId());
        if (req.tier() != null) sub.setTier(req.tier());
        if (req.dataResidency() != null) sub.setDataResidency(req.dataResidency());
        sub = orgRepo.save(sub);
        return toOrgResponse(sub);
    }

    @Transactional(readOnly = true)
    public List<OrgResponse> listSubOrgs(UUID parentOrgId) {
        return orgRepo.findByParentOrgIdAndDeletedAtIsNull(parentOrgId).stream()
                .map(this::toOrgResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<UserResponse> listUsers(UUID orgId) {
        List<AppUser> users = userRepo.findByOrgIdAndDeletedAtIsNull(orgId);
        Map<UUID, List<String>> roleMap = buildRoleMap(orgId);
        return users.stream()
                .map(u -> toUserResponse(u, roleMap.getOrDefault(u.getId(), List.of())))
                .toList();
    }

    @Transactional
    public UserResponse inviteUser(UUID orgId, InviteUserRequest req) {
        if (userRepo.findByOrgIdAndEmailAndDeletedAtIsNull(orgId, req.email()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "User already exists in this org");
        }
        AppUser user = new AppUser();
        user.setOrgId(orgId);
        user.setEmail(req.email());
        String password = req.tempPassword() != null ? req.tempPassword() : generateTempPassword();
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setStatus("active");
        user = userRepo.save(user);

        for (String roleCode : req.roles()) {
            Role role = roleRepo.findByCode(roleCode);
            if (role == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown role: " + roleCode);
            }
            UserRole ur = new UserRole();
            ur.setUserId(user.getId());
            ur.setRoleId(role.getId());
            ur.setOrgId(orgId);
            userRoleRepo.save(ur);
        }

        return toUserResponse(user, req.roles());
    }

    @Transactional
    public UserResponse updateUser(UUID orgId, UUID userId, UpdateUserRequest req) {
        AppUser user = userRepo.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        if (!user.getOrgId().equals(orgId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "User does not belong to this org");
        }

        if (req.status() != null) {
            user.setStatus(req.status());
        }

        if (req.roles() != null) {
            userRoleRepo.deleteByUserId(userId);
            for (String roleCode : req.roles()) {
                Role role = roleRepo.findByCode(roleCode);
                if (role == null) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown role: " + roleCode);
                }
                UserRole ur = new UserRole();
                ur.setUserId(userId);
                ur.setRoleId(role.getId());
                ur.setOrgId(orgId);
                userRoleRepo.save(ur);
            }
        }

        user.setUpdatedAt(java.time.Instant.now());
        user = userRepo.save(user);

        List<String> roles = req.roles() != null ? req.roles() : userRoleRepo.findRoleCodesByUserId(userId);
        return toUserResponse(user, roles);
    }

    private OrgResponse toOrgResponse(Organization org) {
        return new OrgResponse(
                org.getId(),
                org.getParentOrgId(),
                org.getName(),
                org.getTier(),
                org.getDataResidency(),
                org.getStatus(),
                org.getCreatedAt()
        );
    }

    private UserResponse toUserResponse(AppUser user, List<String> roles) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.isMfaEnabled(),
                user.getStatus(),
                roles,
                user.getCreatedAt()
        );
    }

    private Map<UUID, List<String>> buildRoleMap(UUID orgId) {
        List<Object[]> rows = userRoleRepo.findRolesByOrgId(orgId);
        Map<UUID, List<String>> map = new HashMap<>();
        for (Object[] row : rows) {
            UUID userId = (UUID) row[0];
            String roleCode = (String) row[1];
            map.computeIfAbsent(userId, k -> new ArrayList<>()).add(roleCode);
        }
        return map;
    }

    private String generateTempPassword() {
        return "Temp_" + UUID.randomUUID().toString().substring(0, 8) + "!";
    }
}
