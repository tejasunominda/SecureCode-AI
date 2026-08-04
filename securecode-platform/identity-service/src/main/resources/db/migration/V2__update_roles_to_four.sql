-- Migration V2: Replace old 8 roles with new 4 roles.
-- The V1 migration was previously applied with 8 roles; this migration
-- cleans up the old roles and ensures only the 4 current roles exist.

-- Remove old user_role references to deleted roles
DELETE FROM user_role WHERE role_id NOT IN (
    SELECT id FROM role WHERE code IN ('SUPER_ADMIN', 'HR', 'TECHNICAL_MANAGER', 'CANDIDATE')
);

-- Delete old roles
DELETE FROM role WHERE code NOT IN ('SUPER_ADMIN', 'HR', 'TECHNICAL_MANAGER', 'CANDIDATE');

-- Insert any missing new roles (idempotent)
INSERT INTO role (code) VALUES
    ('SUPER_ADMIN'),
    ('HR'),
    ('TECHNICAL_MANAGER'),
    ('CANDIDATE')
ON CONFLICT (code) DO NOTHING;
