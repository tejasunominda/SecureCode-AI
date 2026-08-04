package ai.securecode.identity.repository;

import ai.securecode.identity.entity.UserRole;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public class UserRoleRepository {

    @PersistenceContext
    private EntityManager em;

    @SuppressWarnings("unchecked")
    public List<String> findRoleCodesByUserId(UUID userId) {
        return em.createNativeQuery("""
                SELECT r.code
                FROM user_role ur
                JOIN role r ON r.id = ur.role_id
                WHERE ur.user_id = :userId
                """)
                .setParameter("userId", userId)
                .getResultList();
    }

    public void save(UserRole userRole) {
        em.persist(userRole);
    }
}
