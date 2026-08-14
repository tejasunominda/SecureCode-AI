package ai.securecode.identity.entity;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

public class UserRoleId implements Serializable {
    private UUID userId;
    private Short roleId;
    private UUID orgId;

    public UserRoleId() {}

    public UserRoleId(UUID userId, Short roleId, UUID orgId) {
        this.userId = userId;
        this.roleId = roleId;
        this.orgId = orgId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof UserRoleId that)) return false;
        return Objects.equals(userId, that.userId)
                && Objects.equals(roleId, that.roleId)
                && Objects.equals(orgId, that.orgId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(userId, roleId, orgId);
    }
}
