package ai.securecode.identity.repository;

import ai.securecode.identity.entity.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AppUserRepository extends JpaRepository<AppUser, UUID> {

    Optional<AppUser> findByOrgIdAndEmailAndDeletedAtIsNull(UUID orgId, String email);

    Optional<AppUser> findFirstByEmailAndDeletedAtIsNull(String email);

    List<AppUser> findByOrgIdAndDeletedAtIsNull(UUID orgId);
}
