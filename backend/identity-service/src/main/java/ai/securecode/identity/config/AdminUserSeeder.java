package ai.securecode.identity.config;

import ai.securecode.identity.entity.AppUser;
import ai.securecode.identity.entity.Organization;
import ai.securecode.identity.entity.UserRole;
import ai.securecode.identity.repository.AppUserRepository;
import ai.securecode.identity.repository.OrganizationRepository;
import ai.securecode.identity.repository.RoleRepository;
import ai.securecode.identity.repository.UserRoleRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
public class AdminUserSeeder implements ApplicationRunner {

    private static final String ADMIN_EMAIL = "admin@securecode.ai";
    private static final String ADMIN_PASSWORD = "SecureCode@123";
    private static final String ORG_NAME = "SecureCode AI";
    private static final UUID DEFAULT_ORG_ID = UUID.fromString("00000000-0000-0000-0000-000000000000");

    private final OrganizationRepository orgRepo;
    private final AppUserRepository userRepo;
    private final RoleRepository roleRepo;
    private final UserRoleRepository userRoleRepo;
    private final Argon2PasswordEncoder passwordEncoder;

    public AdminUserSeeder(OrganizationRepository orgRepo,
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

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        var superAdmin = roleRepo.findByCode("SUPER_ADMIN");
        if (superAdmin == null) {
            throw new IllegalStateException("SUPER_ADMIN role must exist before seeding admin user");
        }

        var org = orgRepo.findById(DEFAULT_ORG_ID)
                .orElseGet(() -> {
                    var newOrg = new Organization();
                    newOrg.setId(DEFAULT_ORG_ID);
                    newOrg.setName(ORG_NAME);
                    newOrg.setStatus("active");
                    newOrg.setTier("enterprise");
                    newOrg.setDataResidency("EU");
                    newOrg.setUpdatedAt(Instant.now());
                    return orgRepo.saveAndFlush(newOrg);
                });

        var existing = userRepo.findFirstByEmailAndDeletedAtIsNull(ADMIN_EMAIL);
        if (existing.isPresent()) {
            var user = existing.get();
            if (!DEFAULT_ORG_ID.equals(user.getOrgId())) {
                user.setOrgId(DEFAULT_ORG_ID);
                userRepo.save(user);
            }
            return;
        }

        var user = new AppUser();
        user.setOrgId(org.getId());
        user.setEmail(ADMIN_EMAIL);
        user.setPasswordHash(passwordEncoder.encode(ADMIN_PASSWORD));
        user.setStatus("active");
        user.setMfaEnabled(false);
        user.setUpdatedAt(Instant.now());
        user = userRepo.save(user);

        var userRole = new UserRole();
        userRole.setUserId(user.getId());
        userRole.setRoleId(superAdmin.getId());
        userRole.setOrgId(org.getId());
        userRoleRepo.save(userRole);
    }
}
