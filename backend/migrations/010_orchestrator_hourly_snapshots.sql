-- Near-real-time hourly aggregates (typically only “today”, but we keep a rolling window).

CREATE TABLE IF NOT EXISTS orchestrator_hourly_snapshots (
  family_id text NOT NULL,
  hour timestamptz NOT NULL, -- date_trunc('hour', ...) timestamp

  signals int NOT NULL DEFAULT 0,
  ingests int NOT NULL DEFAULT 0,
  suppressed int NOT NULL DEFAULT 0,
  duplicates int NOT NULL DEFAULT 0,

  actions_created int NOT NULL DEFAULT 0,
  actions_completed int NOT NULL DEFAULT 0,

  updated_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (family_id, hour)
);

CREATE INDEX IF NOT EXISTS idx_ohs_family_hour
  ON orchestrator_hourly_snapshots (family_id, hour DESC);
