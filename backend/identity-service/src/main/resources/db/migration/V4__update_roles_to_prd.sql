-- Migration V4: Update roles to match PRD permission matrix (8 roles).
-- Replaces old HR/TECHNICAL_MANAGER roles with the full PRD role set.

-- Remove user_role references to roles being renamed/removed
DELETE FROM user_role WHERE role_id IN (
    SELECT id FROM role WHERE code IN ('HR', 'TECHNICAL_MANAGER')
);

-- Delete old roles that are no longer in the PRD
DELETE FROM role WHERE code IN ('HR', 'TECHNICAL_MANAGER');

-- Insert the full 8 PRD roles (idempotent)
INSERT INTO role (code) VALUES
    ('SUPER_ADMIN'),
    ('ORG_ADMIN'),
    ('RECRUITER'),
    ('FACULTY'),
    ('INVIGILATOR'),
    ('CANDIDATE'),
    ('EVALUATOR'),
    ('AUDITOR')
ON CONFLICT (code) DO NOTHING;
