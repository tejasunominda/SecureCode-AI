package ai.securecode.identity.service;

import ai.securecode.identity.config.Argon2PasswordEncoder;
import ai.securecode.identity.dto.CreateOrgRequest;
import ai.securecode.identity.dto.InviteUserRequest;
import ai.securecode.identity.dto.OrgResponse;
import ai.securecode.identity.dto.UpdateUserRequest;
import ai.securecode.identity.dto.UserResponse;
import ai.securecode.identity.entity.*;
import ai.securecode.identity.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrgManagementServiceTest {

    @Mock private OrganizationRepository orgRepo;
    @Mock private AppUserRepository userRepo;
    @Mock private RoleRepository roleRepo;
    @Mock private UserRoleRepository userRoleRepo;
    @Mock private Argon2PasswordEncoder passwordEncoder;

    @InjectMocks
    private OrgManagementService service;

    private UUID orgId;

    @BeforeEach
    void setUp() {
        orgId = UUID.randomUUID();
    }

    @Test
    void createOrg_savesAndReturnsResponse() {
        CreateOrgRequest req = new CreateOrgRequest("Acme Corp", "enterprise", "us", null);
        when(orgRepo.save(any(Organization.class))).thenAnswer(inv -> {
            Organization o = inv.getArgument(0);
            o.setId(UUID.randomUUID());
            return o;
        });

        OrgResponse result = service.createOrg(req);

        assertEquals("Acme Corp", result.name());
        assertEquals("enterprise", result.tier());
        assertNotNull(result.id());
    }

    @Test
    void createSubOrg_setsParentOrgId() {
        UUID parentId = UUID.randomUUID();
        Organization parent = new Organization();
        parent.setId(parentId);
        parent.setName("Parent");

        CreateOrgRequest req = new CreateOrgRequest("Sub Org", null, null, null);
        when(orgRepo.findById(parentId)).thenReturn(Optional.of(parent));
        when(orgRepo.save(any(Organization.class))).thenAnswer(inv -> {
            Organization o = inv.getArgument(0);
            o.setId(UUID.randomUUID());
            return o;
        });

        OrgResponse result = service.createSubOrg(parentId, req);

        assertEquals(parentId, result.parentOrgId());
        assertEquals("Sub Org", result.name());
    }

    @Test
    void inviteUser_createsUserWithRoles() {
        Role role = new Role();
        role.setId((short) 1);
        role.setCode("ORG_ADMIN");

        when(userRepo.findByOrgIdAndEmailAndDeletedAtIsNull(orgId, "test@acme.com"))
                .thenReturn(Optional.empty());
        when(passwordEncoder.encode(any())).thenReturn("hashed");
        when(userRepo.save(any(AppUser.class))).thenAnswer(inv -> {
            AppUser u = inv.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });
        when(roleRepo.findByCode("ORG_ADMIN")).thenReturn(role);

        InviteUserRequest req = new InviteUserRequest("test@acme.com", List.of("ORG_ADMIN"), null);
        UserResponse result = service.inviteUser(orgId, req);

        assertEquals("test@acme.com", result.email());
        assertEquals(List.of("ORG_ADMIN"), result.roles());
        assertEquals("active", result.status());
    }

    @Test
    void inviteUser_throwsWhenDuplicate() {
        AppUser existing = new AppUser();
        existing.setEmail("test@acme.com");
        when(userRepo.findByOrgIdAndEmailAndDeletedAtIsNull(orgId, "test@acme.com"))
                .thenReturn(Optional.of(existing));

        InviteUserRequest req = new InviteUserRequest("test@acme.com", List.of("ORG_ADMIN"), null);
        assertThrows(ResponseStatusException.class, () -> service.inviteUser(orgId, req));
    }

    @Test
    void updateUser_updatesStatusAndRoles() {
        UUID userId = UUID.randomUUID();
        AppUser user = new AppUser();
        user.setId(userId);
        user.setOrgId(orgId);
        user.setEmail("test@acme.com");
        user.setStatus("active");

        Role role = new Role();
        role.setId((short) 2);
        role.setCode("RECRUITER");

        when(userRepo.findById(userId)).thenReturn(Optional.of(user));
        when(roleRepo.findByCode("RECRUITER")).thenReturn(role);
        when(userRepo.save(any(AppUser.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateUserRequest req = new UpdateUserRequest(List.of("RECRUITER"), "suspended");
        UserResponse result = service.updateUser(orgId, userId, req);

        assertEquals("suspended", result.status());
        assertEquals(List.of("RECRUITER"), result.roles());
    }

    @Test
    void updateUser_updatesStatusOnlyWhenRolesNull() {
        UUID userId = UUID.randomUUID();
        AppUser user = new AppUser();
        user.setId(userId);
        user.setOrgId(orgId);
        user.setEmail("test@acme.com");
        user.setStatus("active");

        when(userRepo.findById(userId)).thenReturn(Optional.of(user));
        when(userRepo.save(any(AppUser.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userRoleRepo.findRoleCodesByUserId(userId)).thenReturn(List.of("ORG_ADMIN"));

        UpdateUserRequest req = new UpdateUserRequest(null, "suspended");
        UserResponse result = service.updateUser(orgId, userId, req);

        assertEquals("suspended", result.status());
        assertEquals(List.of("ORG_ADMIN"), result.roles());
    }

    @Test
    void updateUser_throwsWhenUserNotInOrg() {
        UUID userId = UUID.randomUUID();
        UUID otherOrgId = UUID.randomUUID();
        AppUser user = new AppUser();
        user.setId(userId);
        user.setOrgId(otherOrgId);

        when(userRepo.findById(userId)).thenReturn(Optional.of(user));

        UpdateUserRequest req = new UpdateUserRequest(null, "suspended");
        assertThrows(ResponseStatusException.class, () -> service.updateUser(orgId, userId, req));
    }
}
