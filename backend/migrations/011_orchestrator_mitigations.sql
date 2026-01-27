-- Track auto-mitigations that temporarily change orchestrator behavior.

CREATE TABLE IF NOT EXISTS orchestrator_mitigations (
  family_id text NOT NULL,
  mitigation_type text NOT NULL, -- duplicate_storm, etc
  active boolean NOT NULL DEFAULT false,
  activated_at timestamptz,
  expires_at timestamptz,
  last_updated timestamptz NOT NULL DEFAULT now(),
  count int NOT NULL DEFAULT 0,

  previous_state_json jsonb,
  applied_patch_json jsonb,
  meta jsonb,

  PRIMARY KEY (family_id, mitigation_type)
);

CREATE INDEX IF NOT EXISTS idx_om_active_expires
  ON orchestrator_mitigations (active, expires_at);
