-- Persist orchestrator_state so the orchestrator survives restarts.

CREATE TABLE IF NOT EXISTS orchestrator_states (
  family_id text PRIMARY KEY,
  updated_at timestamptz NOT NULL,
  zone text NOT NULL,
  tension numeric NOT NULL,
  slack numeric NOT NULL,
  cooldown_until timestamptz,
  state_json jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orch_states_updated
  ON orchestrator_states (updated_at DESC);
