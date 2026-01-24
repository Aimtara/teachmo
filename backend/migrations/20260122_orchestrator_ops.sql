-- Ops tables for orchestrator operability.

CREATE TABLE IF NOT EXISTS families (
  id text PRIMARY KEY,
  name text,
  status text NOT NULL DEFAULT 'active',
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orchestrator_daily_snapshots (
  family_id text NOT NULL,
  day date NOT NULL,
  signals int NOT NULL DEFAULT 0,
  ingests int NOT NULL DEFAULT 0,
  suppressed int NOT NULL DEFAULT 0,
  duplicates int NOT NULL DEFAULT 0,
  actions_created int NOT NULL DEFAULT 0,
  actions_completed int NOT NULL DEFAULT 0,
  forbidden_family int NOT NULL DEFAULT 0,
  auth_invalid_token int NOT NULL DEFAULT 0,
  auth_missing_token int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (family_id, day)
);

CREATE INDEX IF NOT EXISTS idx_ops_daily_family_day
  ON orchestrator_daily_snapshots (family_id, day DESC);

CREATE TABLE IF NOT EXISTS orchestrator_hourly_snapshots (
  family_id text NOT NULL,
  hour timestamptz NOT NULL,
  signals int NOT NULL DEFAULT 0,
  ingests int NOT NULL DEFAULT 0,
  suppressed int NOT NULL DEFAULT 0,
  duplicates int NOT NULL DEFAULT 0,
  actions_created int NOT NULL DEFAULT 0,
  actions_completed int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (family_id, hour)
);

CREATE INDEX IF NOT EXISTS idx_ops_hourly_family_hour
  ON orchestrator_hourly_snapshots (family_id, hour DESC);

CREATE TABLE IF NOT EXISTS orchestrator_anomalies (
  id bigserial PRIMARY KEY,
  family_id text NOT NULL,
  anomaly_type text NOT NULL,
  severity text NOT NULL DEFAULT 'warn',
  status text NOT NULL DEFAULT 'open',
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  count int NOT NULL DEFAULT 1,
  window_minutes int NOT NULL DEFAULT 10,
  meta jsonb,
  UNIQUE (family_id, anomaly_type)
);

CREATE INDEX IF NOT EXISTS idx_ops_anomalies_family_last
  ON orchestrator_anomalies (family_id, last_seen DESC);

-- NOTE: canonical anomaly lifecycle columns are added in later migrations;
-- keep this as a no-op for backwards compatibility.
ALTER TABLE orchestrator_anomalies
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open';

CREATE TABLE IF NOT EXISTS orchestrator_alert_deliveries (
  id bigserial PRIMARY KEY,
  endpoint_id bigint NOT NULL REFERENCES orchestrator_alert_endpoints(id) ON DELETE CASCADE,
  family_id text NOT NULL,
  anomaly_type text NOT NULL,
  severity text NOT NULL,
  dedupe_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'sent',
  response_code int,
  response_body text,
  payload_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ops_alert_deliveries
  ON orchestrator_alert_deliveries (family_id, created_at DESC);

-- NOTE: mitigations are tracked in orchestrator_mitigations (011_orchestrator_mitigations.sql).
