-- Persist action queue + action events.

CREATE TABLE IF NOT EXISTS orchestrator_actions (
  id text PRIMARY KEY,
  family_id text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'queued',
  type text NOT NULL,
  action_json jsonb NOT NULL,
  completed_at timestamptz,
  dismissed_at timestamptz,
  CONSTRAINT orchestrator_actions_status_check CHECK (status IN ('queued','completed','dismissed'))
);

CREATE INDEX IF NOT EXISTS idx_orcha_family_status_created
  ON orchestrator_actions (family_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS orchestrator_action_events (
  id bigserial PRIMARY KEY,
  action_id text NOT NULL REFERENCES orchestrator_actions(id) ON DELETE CASCADE,
  family_id text NOT NULL,
  event_type text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  meta jsonb
);

CREATE INDEX IF NOT EXISTS idx_orchae_action_occurred
  ON orchestrator_action_events (action_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_orchae_family_occurred
  ON orchestrator_action_events (family_id, occurred_at DESC);
