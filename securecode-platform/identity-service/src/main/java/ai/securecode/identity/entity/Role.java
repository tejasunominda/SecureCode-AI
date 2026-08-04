package ai.securecode.identity.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "role")
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Short id;

    @Column(nullable = false, unique = true)
    private String code;

    public Short getId() { return id; }
    public void setId(Short id) { this.id = id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
}
