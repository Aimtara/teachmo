-- Alert endpoints per family (Slack/webhook/email).
CREATE TABLE IF NOT EXISTS orchestrator_alert_endpoints (
  id bigserial PRIMARY KEY,
  family_id text NOT NULL,
  type text NOT NULL,          -- webhook|slack|email
  target text NOT NULL,        -- url or email address
  secret text,                 -- optional shared secret for webhook signing
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oae_family_enabled
  ON orchestrator_alert_endpoints (family_id, enabled);

-- Delivery attempts (so alerts are traceable and deduped)
CREATE TABLE IF NOT EXISTS orchestrator_alert_deliveries (
  id bigserial PRIMARY KEY,
  endpoint_id bigint NOT NULL REFERENCES orchestrator_alert_endpoints(id) ON DELETE CASCADE,
  family_id text NOT NULL,
  anomaly_type text NOT NULL,
  severity text NOT NULL,        -- info|warn|error
  dedupe_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'sent',  -- sent|failed|skipped
  response_code int,
  response_body text,
  payload_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oad_family_created
  ON orchestrator_alert_deliveries (family_id, created_at DESC);
