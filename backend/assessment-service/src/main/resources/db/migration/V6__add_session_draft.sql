-- V6: Add session_draft table for auto-save/resume support
CREATE TABLE IF NOT EXISTS session_draft (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id              UUID NOT NULL UNIQUE,
    current_section         VARCHAR(30),
    current_question_index  INT,
    code                    TEXT,
    language                VARCHAR(30),
    answers_json            TEXT,
    saved_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add 'rejected' to the set of allowed status values for question workflow
-- (status column is VARCHAR, no CHECK constraint to alter)
ALTER TABLE question ALTER COLUMN status SET DEFAULT 'draft';
