-- Reporting Service schema (PRD Part D.2 / FR-RPT-03/04).
-- Materialized views for analytics aggregation.

CREATE TABLE org_analytics (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL,
    total_sessions          INT NOT NULL DEFAULT 0,
    completed_sessions      INT NOT NULL DEFAULT 0,
    terminated_sessions     INT NOT NULL DEFAULT 0,
    avg_score               NUMERIC(6,2) DEFAULT 0,
    pass_rate               NUMERIC(5,2) DEFAULT 0,
    total_violations        INT NOT NULL DEFAULT 0,
    confirmed_violations    INT NOT NULL DEFAULT 0,
    hiring_shortlisted      INT NOT NULL DEFAULT 0,
    hiring_rejected         INT NOT NULL DEFAULT 0,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (org_id)
);

CREATE TABLE question_analytics (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL,
    question_id     UUID NOT NULL,
    question_type   VARCHAR(30),
    difficulty      VARCHAR(20),
    times_attempted INT NOT NULL DEFAULT 0,
    correct_count   INT NOT NULL DEFAULT 0,
    avg_time_ms     BIGINT DEFAULT 0,
    discrimination_index NUMERIC(5,2) DEFAULT 0,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (org_id, question_id)
);
CREATE INDEX idx_qa_org ON question_analytics(org_id);

CREATE TABLE skill_gap_analysis (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL,
    skill_tag       VARCHAR(100) NOT NULL,
    total_attempts  INT NOT NULL DEFAULT 0,
    pass_count      INT NOT NULL DEFAULT 0,
    avg_score       NUMERIC(6,2) DEFAULT 0,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (org_id, skill_tag)
);
CREATE INDEX idx_sga_org ON skill_gap_analysis(org_id);

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
