-- V2: Session recording metadata and enhanced proctoring detection

CREATE TABLE session_recording (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL,
    recording_type  VARCHAR(30) NOT NULL,
    storage_url     TEXT NOT NULL,
    duration_ms     BIGINT,
    file_size_bytes BIGINT,
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_recording_session ON session_recording(session_id);

-- Enhanced proctoring event types
ALTER TABLE proctoring_event ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2);
ALTER TABLE proctoring_event ADD COLUMN IF NOT EXISTS evidence_url TEXT;
ALTER TABLE proctoring_event ADD COLUMN IF NOT EXISTS detection_metadata JSONB;

-- Composite risk score tracking
ALTER TABLE risk_score_snapshot ADD COLUMN IF NOT EXISTS voice_activity_score DECIMAL(3,2) DEFAULT 0.0;
ALTER TABLE risk_score_snapshot ADD COLUMN IF NOT EXISTS gaze_score DECIMAL(3,2) DEFAULT 0.0;
ALTER TABLE risk_score_snapshot ADD COLUMN IF NOT EXISTS object_detection_score DECIMAL(3,2) DEFAULT 0.0;
ALTER TABLE risk_score_snapshot ADD COLUMN IF NOT EXISTS code_similarity_score DECIMAL(3,2) DEFAULT 0.0;
