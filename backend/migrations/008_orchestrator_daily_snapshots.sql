-- Rolling aggregates for fast health dashboards.

CREATE TABLE IF NOT EXISTS orchestrator_daily_snapshots (
  family_id text NOT NULL,
  day date NOT NULL,

  -- Orchestrator volume
  signals int NOT NULL DEFAULT 0,
  ingests int NOT NULL DEFAULT 0,
  suppressed int NOT NULL DEFAULT 0,
  duplicates int NOT NULL DEFAULT 0,

  -- Actions
  actions_created int NOT NULL DEFAULT 0,
  actions_completed int NOT NULL DEFAULT 0,

  -- Security/auth noise (useful for ops)
  forbidden_family int NOT NULL DEFAULT 0,
  auth_invalid_token int NOT NULL DEFAULT 0,
  auth_missing_token int NOT NULL DEFAULT 0,

  updated_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (family_id, day)
);

CREATE INDEX IF NOT EXISTS idx_ods_family_day
  ON orchestrator_daily_snapshots (family_id, day DESC);
