-- Identity Service baseline schema (PRD Part D.2).
-- Owns: organization, app_user, role, user_role, and this service's local
-- audit_log partition of cross-cutting audit events (auth, permission
-- changes, org management). Per PRD C.3 Service Inventory, each service
-- owns its own PostgreSQL database; cross-service references (e.g.
-- assessment.org_id) are by UUID only, with no cross-database FK.

CREATE TABLE organization (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_org_id   UUID REFERENCES organization(id),
    name            VARCHAR(255) NOT NULL,
    tier            VARCHAR(50) NOT NULL DEFAULT 'starter',
    data_residency  VARCHAR(50) DEFAULT 'us',
    status          VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ NULL          -- soft delete
);
CREATE INDEX idx_org_parent ON organization(parent_org_id);

CREATE TABLE app_user (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organization(id),
    email           VARCHAR(320) NOT NULL,
    password_hash   TEXT,
    mfa_enabled     BOOLEAN NOT NULL DEFAULT false,
    mfa_secret      TEXT,
    status          VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ NULL,
    UNIQUE (org_id, email)
);
CREATE INDEX idx_user_org ON app_user(org_id);

CREATE TABLE role (
    id      SMALLSERIAL PRIMARY KEY,
    code    VARCHAR(50) UNIQUE NOT NULL   -- SUPER_ADMIN, HR, TECHNICAL_MANAGER, CANDIDATE
);

INSERT INTO role (code) VALUES
    ('SUPER_ADMIN'), ('HR'), ('TECHNICAL_MANAGER'), ('CANDIDATE');

CREATE TABLE user_role (
    user_id     UUID NOT NULL REFERENCES app_user(id),
    role_id     SMALLINT NOT NULL REFERENCES role(id),
    org_id      UUID NOT NULL REFERENCES organization(id),
    PRIMARY KEY (user_id, role_id, org_id)
);

-- Append-only, hash-chained audit log (PRD B.5.9 / D.3). No UPDATE/DELETE
-- path is exposed by the AuditLogAppender port (common module); this trigger
-- is a defense-in-depth backstop enforcing the same guarantee at the DB
-- level regardless of application-layer bugs.
CREATE TABLE audit_log (
    id              BIGSERIAL PRIMARY KEY,
    org_id          UUID NOT NULL,
    actor_user_id   UUID,
    action          VARCHAR(100) NOT NULL,
    entity_type     VARCHAR(50),
    entity_id       UUID,
    prev_hash       CHAR(64),
    entry_hash      CHAR(64) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_org ON audit_log(org_id, created_at);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);

CREATE OR REPLACE FUNCTION reject_audit_log_mutation() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'audit_log is append-only: % operation is not permitted', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_log_no_update
    BEFORE UPDATE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION reject_audit_log_mutation();

CREATE TRIGGER trg_audit_log_no_delete
    BEFORE DELETE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION reject_audit_log_mutation();
