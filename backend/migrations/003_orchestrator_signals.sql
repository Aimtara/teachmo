-- Persist ingested signals so planning survives restarts.

CREATE TABLE IF NOT EXISTS orchestrator_signals (
  id text PRIMARY KEY,
  family_id text NOT NULL,
  child_id text,
  source text NOT NULL,
  type text NOT NULL,
  occurred_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  features_json jsonb,
  payload_json jsonb,
  signal_json jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orchs_family_occurred
  ON orchestrator_signals (family_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_orchs_family_type_occurred
  ON orchestrator_signals (family_id, type, occurred_at DESC);
