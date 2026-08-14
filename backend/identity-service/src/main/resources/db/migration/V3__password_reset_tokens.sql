-- Password reset tokens for forgot-password flow (PRD FR-AUTH-05)

CREATE TABLE password_reset_token (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES app_user(id),
    token       VARCHAR(255) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_prt_user ON password_reset_token(user_id);
CREATE INDEX idx_prt_token ON password_reset_token(token);
