package ai.securecode.identity.repository;

import ai.securecode.identity.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoleRepository extends JpaRepository<Role, Short> {
    Role findByCode(String code);
}
