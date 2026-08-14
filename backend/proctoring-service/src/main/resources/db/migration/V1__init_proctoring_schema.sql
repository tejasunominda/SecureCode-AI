-- Proctoring Service baseline schema (PRD Part D.2 / E.5).
-- Owns: proctoring_event, risk_score_snapshot, risk_score_history, and this
-- service's local audit_log partition (reviewer confirm/dismiss decisions,
-- PRD Section E.7). session_id references assessment-service's
-- assessment_session by UUID only (no cross-database FK).

-- proctoring_event is range-partitioned by occurred_at (monthly) per PRD
-- D.3, same rationale/retention policy as assessment_session. Only a
-- default partition is created here; time-bounded partitions are deferred
-- to a later migration/scheduled job.
CREATE TABLE proctoring_event (
    id              UUID NOT NULL DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL,
    event_type      VARCHAR(50) NOT NULL,      -- face_lost, multi_face, tab_switch, ...
    source          VARCHAR(20) NOT NULL,      -- 'browser' | 'desktop_client'
    severity        SMALLINT NOT NULL,
    evidence_uri    TEXT,
    occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ NULL,
    PRIMARY KEY (id, occurred_at)
) PARTITION BY RANGE (occurred_at);

CREATE TABLE proctoring_event_default PARTITION OF proctoring_event DEFAULT;
CREATE INDEX idx_proctoring_session ON proctoring_event(session_id);

-- Latest computed composite risk score per session (PRD E.5 formula).
CREATE TABLE risk_score_snapshot (
    session_id      UUID PRIMARY KEY,
    score           NUMERIC(5,2) NOT NULL DEFAULT 0,
    last_event_at   TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Full recomputation history, useful for audit/replay and false-positive analysis.
CREATE TABLE risk_score_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL,
    score           NUMERIC(5,2) NOT NULL,
    triggering_event_id UUID,
    computed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_risk_history_session ON risk_score_history(session_id, computed_at);

-- Human review decisions (PRD E.7: no adverse action from AI score alone).
CREATE TABLE violation_review (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proctoring_event_id UUID NOT NULL,
    session_id      UUID NOT NULL,
    reviewer_user_id UUID NOT NULL,
    decision        VARCHAR(20) NOT NULL,   -- confirmed | dismissed
    notes           TEXT,
    reviewed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_violation_review_session ON violation_review(session_id);

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
