-- Consolidate ops tables to canonical orchestrator tables and add timeline support.

DO $$
BEGIN
  IF to_regclass('public.family_alert_endpoints') IS NOT NULL THEN
    INSERT INTO orchestrator_alert_endpoints
      (family_id, type, target, secret, enabled, created_at)
    SELECT
      fae.family_id,
      fae.type,
      fae.target,
      fae.secret,
      fae.enabled,
      fae.created_at
    FROM family_alert_endpoints fae
    WHERE NOT EXISTS (
      SELECT 1
      FROM orchestrator_alert_endpoints oae
      WHERE oae.family_id = fae.family_id
        AND oae.type = fae.type
        AND oae.target = fae.target
    );

    IF to_regclass('public.orchestrator_alert_deliveries') IS NOT NULL THEN
      UPDATE orchestrator_alert_deliveries d
      SET endpoint_id = oae.id
      FROM family_alert_endpoints fae
      JOIN orchestrator_alert_endpoints oae
        ON oae.family_id = fae.family_id
       AND oae.type = fae.type
       AND oae.target = fae.target
      WHERE d.endpoint_id = fae.id;
    END IF;
  END IF;
END $$;

ALTER TABLE IF EXISTS orchestrator_alert_deliveries
  DROP CONSTRAINT IF EXISTS orchestrator_alert_deliveries_endpoint_id_fkey;

ALTER TABLE IF EXISTS orchestrator_alert_deliveries
  ADD CONSTRAINT orchestrator_alert_deliveries_endpoint_id_fkey
  FOREIGN KEY (endpoint_id) REFERENCES orchestrator_alert_endpoints(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS orchestrator_anomalies
  ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS acknowledged_by text,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_by text,
  ADD COLUMN IF NOT EXISTS status_note text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Consolidate Ops schema onto canonical orchestrator tables and add anomaly lifecycle + timeline support.
--
-- This migration is intentionally idempotent.

-- 1) Ensure canonical alert tables exist (these should already exist via 009_orchestrator_alerting.sql).
CREATE TABLE IF NOT EXISTS orchestrator_alert_endpoints (
  id bigserial PRIMARY KEY,
  family_id text NOT NULL,
  type text NOT NULL,
  target text NOT NULL,
  secret text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orchestrator_alert_deliveries (
  id bigserial PRIMARY KEY,
  endpoint_id bigint NOT NULL,
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

-- 2) If the legacy ops table family_alert_endpoints exists, migrate its rows into orchestrator_alert_endpoints
--    and remap orchestrator_alert_deliveries.endpoint_id to the canonical endpoint ids.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'family_alert_endpoints'
  ) THEN
    -- Insert missing endpoints (dedupe by family_id/type/target).
    WITH src AS (
      SELECT id AS old_id, family_id, type, target, secret, enabled, created_at
      FROM family_alert_endpoints
    ),
    ins AS (
      INSERT INTO orchestrator_alert_endpoints (family_id, type, target, secret, enabled, created_at)
      SELECT s.family_id, s.type, s.target, s.secret, s.enabled, s.created_at
      FROM src s
      WHERE NOT EXISTS (
        SELECT 1
        FROM orchestrator_alert_endpoints o
        WHERE o.family_id = s.family_id AND o.type = s.type AND o.target = s.target
      )
      RETURNING id, family_id, type, target
    ),
    map AS (
      SELECT s.old_id, o.id AS new_id
      FROM src s
      JOIN orchestrator_alert_endpoints o
        ON o.family_id = s.family_id AND o.type = s.type AND o.target = s.target
    )
    UPDATE orchestrator_alert_deliveries d
    SET endpoint_id = map.new_id
    FROM map
    WHERE d.endpoint_id = map.old_id;
  END IF;
END $$;

-- 3) Ensure orchestrator_alert_deliveries.endpoint_id FK points to orchestrator_alert_endpoints.
ALTER TABLE orchestrator_alert_deliveries
  DROP CONSTRAINT IF EXISTS orchestrator_alert_deliveries_endpoint_id_fkey;

ALTER TABLE orchestrator_alert_deliveries
  ADD CONSTRAINT orchestrator_alert_deliveries_endpoint_id_fkey
  FOREIGN KEY (endpoint_id) REFERENCES orchestrator_alert_endpoints(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_oae_family_enabled
  ON orchestrator_alert_endpoints (family_id, enabled);

CREATE INDEX IF NOT EXISTS idx_oad_family_created
  ON orchestrator_alert_deliveries (family_id, created_at DESC);

-- 4) Anomaly lifecycle support (ack/close/reopen).
ALTER TABLE orchestrator_anomalies
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open';

ALTER TABLE orchestrator_anomalies
  ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz;

ALTER TABLE orchestrator_anomalies
  ADD COLUMN IF NOT EXISTS acknowledged_by text;

ALTER TABLE orchestrator_anomalies
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

ALTER TABLE orchestrator_anomalies
  ADD COLUMN IF NOT EXISTS closed_by text;

ALTER TABLE orchestrator_anomalies
  ADD COLUMN IF NOT EXISTS status_note text;

ALTER TABLE orchestrator_anomalies
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_anomalies_family_status_last
  ON orchestrator_anomalies (family_id, status, last_seen DESC);

-- 5) Append-only anomaly action log (powers timeline + auditability).
CREATE TABLE IF NOT EXISTS orchestrator_anomaly_actions (
  id bigserial PRIMARY KEY,
  family_id text NOT NULL,
  anomaly_type text NOT NULL,
  action text NOT NULL,
  actor text,
  note text,
  meta jsonb,
  action text NOT NULL, -- ack|close|reopen|note
  note text,
  actor text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oaa_family_created
  ON orchestrator_anomaly_actions (family_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_oaa_family_anomaly_created
  ON orchestrator_anomaly_actions (family_id, anomaly_type, created_at DESC);
