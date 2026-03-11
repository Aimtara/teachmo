-- Teachmo Orchestrator core tables
-- These tables provide a "flight recorder" for AI routing decisions and the artifacts produced.

-- Orchestrator runs: one row per request routed by the orchestrator.
CREATE TABLE IF NOT EXISTS orchestrator_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid,
  profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  app_role text NOT NULL CHECK (app_role IN (
    'parent','teacher','partner','system_admin','school_admin','district_admin'
  )),
  channel text NOT NULL CHECK (channel IN (
    'CHAT','PUSH','EMAIL','UI_ACTION','SYSTEM_EVENT'
  )),
  route text NOT NULL,
  confidence numeric NOT NULL DEFAULT 0,
  safety_level text NOT NULL DEFAULT 'NONE' CHECK (safety_level IN (
    'NONE','SENSITIVE','URGENT','BLOCKED'
  )),
  missing_context jsonb NOT NULL DEFAULT '[]'::jsonb,
  extracted_entities jsonb NOT NULL DEFAULT '{}'::jsonb,
  success boolean NOT NULL DEFAULT false,
  latency_ms integer,
  error_code text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orchestrator_runs_profile_id_idx ON orchestrator_runs(profile_id);
CREATE INDEX IF NOT EXISTS orchestrator_runs_created_at_idx ON orchestrator_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS orchestrator_runs_route_idx ON orchestrator_runs(route);
CREATE INDEX IF NOT EXISTS orchestrator_runs_safety_level_idx ON orchestrator_runs(safety_level);

-- Orchestrator artifacts: structured outputs that should be re-openable (drafts, briefs, summaries, etc.).
CREATE TABLE IF NOT EXISTS orchestrator_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES orchestrator_runs(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  artifact_type text NOT NULL CHECK (artifact_type IN (
    'MESSAGE_DRAFT','BRIEF','SUMMARY','DEEPLINK','OTHER'
  )),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orchestrator_artifacts_run_id_idx ON orchestrator_artifacts(run_id);
CREATE INDEX IF NOT EXISTS orchestrator_artifacts_profile_id_idx ON orchestrator_artifacts(profile_id);
CREATE INDEX IF NOT EXISTS orchestrator_artifacts_type_idx ON orchestrator_artifacts(artifact_type);
CREATE INDEX IF NOT EXISTS orchestrator_artifacts_expires_at_idx ON orchestrator_artifacts(expires_at);

-- Ensure updated_at is maintained for the new tables.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    DROP TRIGGER IF EXISTS orchestrator_runs_updated_at ON orchestrator_runs;
    CREATE TRIGGER orchestrator_runs_updated_at
    BEFORE UPDATE ON orchestrator_runs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

    DROP TRIGGER IF EXISTS orchestrator_artifacts_updated_at ON orchestrator_artifacts;
    CREATE TRIGGER orchestrator_artifacts_updated_at
    BEFORE UPDATE ON orchestrator_artifacts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END;
$$;
