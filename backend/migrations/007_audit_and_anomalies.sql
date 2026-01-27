-- Structured audit events (auth failures, forbidden access, duplicates, etc.)
CREATE TABLE IF NOT EXISTS security_audit_events (
  id bigserial PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL,              -- e.g., auth_missing_token, auth_invalid_token, forbidden_family, duplicate_signal
  severity text NOT NULL DEFAULT 'info', -- info|warn|error
  user_id text,
  family_id text,
  ip inet,
  user_agent text,
  method text,
  path text,
  status_code int,
  request_id text,
  meta jsonb
);

CREATE INDEX IF NOT EXISTS idx_audit_created
  ON security_audit_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_family_created
  ON security_audit_events (family_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_user_created
  ON security_audit_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_type_created
  ON security_audit_events (event_type, created_at DESC);

-- Anomaly flags: coarse “something is weird” signals for operability
CREATE TABLE IF NOT EXISTS orchestrator_anomalies (
  id bigserial PRIMARY KEY,
  family_id text NOT NULL,
  anomaly_type text NOT NULL,        -- e.g., repeated_forbidden_access, repeated_duplicate_signals
  severity text NOT NULL DEFAULT 'warn',
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  count int NOT NULL DEFAULT 1,
  window_minutes int NOT NULL DEFAULT 10,
  meta jsonb,
  UNIQUE (family_id, anomaly_type)
);

CREATE INDEX IF NOT EXISTS idx_anomalies_family_last
  ON orchestrator_anomalies (family_id, last_seen DESC);
