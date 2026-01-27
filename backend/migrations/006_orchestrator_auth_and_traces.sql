-- Multi-tenant authorization: who can access which family
CREATE TABLE IF NOT EXISTS family_memberships (
  family_id text NOT NULL,
  user_id text NOT NULL,
  role text NOT NULL DEFAULT 'parent',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (family_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_family_memberships_user
  ON family_memberships (user_id);

-- Observability: decision traces
CREATE TABLE IF NOT EXISTS orchestrator_decision_traces (
  id bigserial PRIMARY KEY,
  family_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  trigger_type text NOT NULL,          -- ingest | daily | weekly
  trigger_id text,                     -- signal_id, plan_id, brief_id, etc
  suppressed_reason text,
  chosen_action_id text,
  zone text,
  tension numeric,
  slack numeric,
  trace_json jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_odt_family_created
  ON orchestrator_decision_traces (family_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_odt_family_trigger
  ON orchestrator_decision_traces (family_id, trigger_type, created_at DESC);
