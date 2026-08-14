-- V8: Assessment-question join table with weight (D.4.4)
-- Links Assessment <-> Question with a per-assessment weight for scoring.

CREATE TABLE assessment_question (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id   UUID NOT NULL REFERENCES assessment(id) ON DELETE CASCADE,
    question_id     UUID NOT NULL REFERENCES question(id) ON DELETE CASCADE,
    weight          DECIMAL(5,2) NOT NULL DEFAULT 1.0,
    display_order   INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(assessment_id, question_id)
);
CREATE INDEX idx_assessment_question_assessment ON assessment_question(assessment_id);
CREATE INDEX idx_assessment_question_question ON assessment_question(question_id);
