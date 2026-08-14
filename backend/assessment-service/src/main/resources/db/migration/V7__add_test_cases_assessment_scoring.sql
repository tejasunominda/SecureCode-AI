-- V7: Normalized test_case table with weights for partial scoring (FR-ASMT-07).
-- Also adds negative_marking, randomize_questions, and assessment locking.

CREATE TABLE test_case (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id     UUID NOT NULL REFERENCES question(id) ON DELETE CASCADE,
    input           TEXT,
    expected_output TEXT,
    is_hidden       BOOLEAN NOT NULL DEFAULT false,
    weight          DECIMAL(5,2) NOT NULL DEFAULT 1.0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_test_case_question ON test_case(question_id);

-- Add negative marking column to question (FR-ASMT-06)
ALTER TABLE question ADD COLUMN negative_marks DECIMAL(5,2) NOT NULL DEFAULT 0.0;

-- Add randomization support (FR-ASMT-03)
ALTER TABLE question ADD COLUMN randomize_pool BOOLEAN NOT NULL DEFAULT false;

-- Assessment table with scoring config, proctoring level, and locking (FR-ASMT-09, A.19.5)
CREATE TABLE assessment (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id                  UUID NOT NULL,
    template_id             UUID NOT NULL REFERENCES assessment_template(id),
    name                    VARCHAR(255) NOT NULL,
    scoring_config          JSONB NOT NULL DEFAULT '{"passThreshold": 60, "negativeMarking": false}'::jsonb,
    proctoring_level        VARCHAR(30) NOT NULL DEFAULT 'standard',
    locked_at               TIMESTAMPTZ,
    version                 INT NOT NULL DEFAULT 1,
    created_by              UUID NOT NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_assessment_org ON assessment(org_id);

-- Soft delete columns (PRD D.2 pattern)
ALTER TABLE applicant ADD COLUMN deleted_at TIMESTAMPTZ NULL;
ALTER TABLE assessment_session ADD COLUMN deleted_at TIMESTAMPTZ NULL;
ALTER TABLE assessment_link ADD COLUMN deleted_at TIMESTAMPTZ NULL;
ALTER TABLE question ADD COLUMN deleted_at TIMESTAMPTZ NULL;

-- Session draft auto-save support already added in V6.
-- Add time tracking for idle timeout enforcement (FR-AUTH-09)
ALTER TABLE assessment_session ADD COLUMN last_activity_at TIMESTAMPTZ;
ALTER TABLE assessment_session ADD COLUMN idle_timeout_min INT NOT NULL DEFAULT 30;
