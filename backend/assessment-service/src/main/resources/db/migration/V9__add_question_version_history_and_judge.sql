-- V9: Question version history table (FR-AUTH-Q-04).
-- Stores snapshots of question content on each edit for diff/rollback.

CREATE TABLE question_version_history (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id         UUID NOT NULL REFERENCES question(id) ON DELETE CASCADE,
    org_id              UUID NOT NULL,
    version             INT NOT NULL,
    body                TEXT NOT NULL,
    option_a            TEXT,
    option_b            TEXT,
    option_c            TEXT,
    option_d            TEXT,
    correct_option      VARCHAR(10),
    difficulty          VARCHAR(30) NOT NULL DEFAULT 'medium',
    test_cases          TEXT,
    hidden_test_cases   TEXT,
    changed_by          UUID NOT NULL,
    changed_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    change_summary      TEXT
);
CREATE INDEX idx_qvh_question ON question_version_history(question_id);
CREATE INDEX idx_qvh_org ON question_version_history(org_id);

-- V9: Add custom judge columns to test_case table (FR-ASMT-08).
ALTER TABLE test_case ADD COLUMN judge_type VARCHAR(30) NOT NULL DEFAULT 'exact';
ALTER TABLE test_case ADD COLUMN judge_code TEXT;
