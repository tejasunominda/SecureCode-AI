ALTER TABLE assessment_session ADD COLUMN IF NOT EXISTS time_multiplier DOUBLE PRECISION;
ALTER TABLE assessment_session ADD COLUMN IF NOT EXISTS proctoring_level_override VARCHAR(50);
ALTER TABLE assessment_session ADD COLUMN IF NOT EXISTS accommodation_notes TEXT;
ALTER TABLE assessment_session ADD COLUMN IF NOT EXISTS accommodation_approved_by UUID;
ALTER TABLE assessment_session ADD COLUMN IF NOT EXISTS accommodation_granted_at TIMESTAMP WITH TIME ZONE;
