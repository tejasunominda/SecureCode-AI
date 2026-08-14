package ai.securecode.identity.repository;

import ai.securecode.identity.entity.Organization;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface OrganizationRepository extends JpaRepository<Organization, UUID> {
    List<Organization> findByParentOrgIdAndDeletedAtIsNull(UUID parentOrgId);
}
