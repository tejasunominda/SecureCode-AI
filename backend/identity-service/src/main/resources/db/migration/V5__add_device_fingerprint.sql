-- V5: Device fingerprint table for FR-AUTH-06.
-- Stores per-login device fingerprints for fraud detection and trusted device tracking.

CREATE TABLE device_fingerprint (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    org_id              UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    fingerprint_hash    VARCHAR(64) NOT NULL,
    user_agent          TEXT,
    platform            VARCHAR(255),
    screen_resolution   VARCHAR(50),
    timezone            VARCHAR(100),
    language            VARCHAR(50),
    first_seen          TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen           TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_trusted          BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX idx_device_fp_user ON device_fingerprint(user_id);
CREATE INDEX idx_device_fp_hash ON device_fingerprint(fingerprint_hash);
