package ai.securecode.identity.config;

import ai.securecode.identity.entity.Role;
import ai.securecode.identity.repository.RoleRepository;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RoleSeeder {

    @Bean
    ApplicationRunner seedRoles(RoleRepository roleRepo) {
        return args -> {
            String[] codes = {"SUPER_ADMIN", "ORG_ADMIN", "HR", "TECHNICAL_MANAGER", "RECRUITER", "FACULTY", "INVIGILATOR", "CANDIDATE", "EVALUATOR", "AUDITOR"};
            for (String code : codes) {
                if (roleRepo.findByCode(code) == null) {
                    Role role = new Role();
                    role.setCode(code);
                    roleRepo.save(role);
                }
            }
        };
    }
}
