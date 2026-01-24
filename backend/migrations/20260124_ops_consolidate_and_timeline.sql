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

CREATE TABLE IF NOT EXISTS orchestrator_anomaly_actions (
  id bigserial PRIMARY KEY,
  family_id text NOT NULL,
  anomaly_type text NOT NULL,
  action text NOT NULL,
  actor text,
  note text,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oaa_family_created
  ON orchestrator_anomaly_actions (family_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_oaa_family_anomaly_created
  ON orchestrator_anomaly_actions (family_id, anomaly_type, created_at DESC);
