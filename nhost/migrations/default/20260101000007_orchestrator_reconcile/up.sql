-- Reconcile orchestrator tables to the canonical 002_orchestrator_core schema.
-- This migration is additive + defensive to avoid breaking existing installs.

-- Ensure base tables exist (no-op if created by earlier migrations).
CREATE TABLE IF NOT EXISTS orchestrator_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid,
  profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  app_role text,
  channel text,
  route text,
  confidence numeric,
  safety_level text,
  missing_context jsonb,
  extracted_entities jsonb,
  success boolean DEFAULT false,
  latency_ms integer,
  error_code text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orchestrator_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES orchestrator_runs(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  artifact_type text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  -- orchestrator_runs columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orchestrator_runs' AND column_name = 'profile_id'
  ) THEN
    ALTER TABLE orchestrator_runs ADD COLUMN profile_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orchestrator_runs' AND column_name = 'app_role'
  ) THEN
    ALTER TABLE orchestrator_runs ADD COLUMN app_role text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orchestrator_runs' AND column_name = 'extracted_entities'
  ) THEN
    ALTER TABLE orchestrator_runs ADD COLUMN extracted_entities jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orchestrator_runs' AND column_name = 'error_code'
  ) THEN
    ALTER TABLE orchestrator_runs ADD COLUMN error_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orchestrator_runs' AND column_name = 'error_message'
  ) THEN
    ALTER TABLE orchestrator_runs ADD COLUMN error_message text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orchestrator_runs' AND column_name = 'missing_context'
  ) THEN
    ALTER TABLE orchestrator_runs ADD COLUMN missing_context jsonb NOT NULL DEFAULT '[]'::jsonb;
  ELSE
    ALTER TABLE orchestrator_runs ALTER COLUMN missing_context SET DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orchestrator_runs' AND column_name = 'safety_level'
  ) THEN
    ALTER TABLE orchestrator_runs ADD COLUMN safety_level text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orchestrator_runs' AND column_name = 'channel'
  ) THEN
    ALTER TABLE orchestrator_runs ADD COLUMN channel text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orchestrator_runs' AND column_name = 'route'
  ) THEN
    ALTER TABLE orchestrator_runs ADD COLUMN route text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orchestrator_runs' AND column_name = 'confidence'
  ) THEN
    ALTER TABLE orchestrator_runs ADD COLUMN confidence numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orchestrator_runs' AND column_name = 'success'
  ) THEN
    ALTER TABLE orchestrator_runs ADD COLUMN success boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orchestrator_runs' AND column_name = 'latency_ms'
  ) THEN
    ALTER TABLE orchestrator_runs ADD COLUMN latency_ms integer;
  END IF;

  -- Reconcile request_id types (text -> uuid) when needed.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orchestrator_runs'
      AND column_name = 'request_id'
      AND data_type <> 'uuid'
  ) THEN
    ALTER TABLE orchestrator_runs ALTER COLUMN request_id DROP NOT NULL;
    ALTER TABLE orchestrator_runs
      ALTER COLUMN request_id TYPE uuid
      USING (
        CASE
          WHEN request_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            THEN request_id::uuid
          ELSE NULL
        END
      );
  END IF;

  -- Backfill profile_id/app_role from legacy columns if present.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orchestrator_runs' AND column_name = 'user_id'
  ) THEN
    UPDATE orchestrator_runs
      SET profile_id = user_id
      WHERE profile_id IS NULL AND user_id IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orchestrator_runs' AND column_name = 'role'
  ) THEN
    UPDATE orchestrator_runs
      SET app_role = role
      WHERE app_role IS NULL AND role IS NOT NULL;
  END IF;

  -- orchestrator_artifacts columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orchestrator_artifacts' AND column_name = 'profile_id'
  ) THEN
    ALTER TABLE orchestrator_artifacts ADD COLUMN profile_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orchestrator_artifacts' AND column_name = 'artifact_type'
  ) THEN
    ALTER TABLE orchestrator_artifacts ADD COLUMN artifact_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orchestrator_artifacts' AND column_name = 'payload'
  ) THEN
    ALTER TABLE orchestrator_artifacts ADD COLUMN payload jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orchestrator_artifacts' AND column_name = 'type'
  ) THEN
    UPDATE orchestrator_artifacts
      SET artifact_type = type
      WHERE artifact_type IS NULL AND type IS NOT NULL;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS orchestrator_runs_profile_id_idx ON orchestrator_runs(profile_id);
CREATE INDEX IF NOT EXISTS orchestrator_runs_created_at_idx ON orchestrator_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS orchestrator_runs_route_idx ON orchestrator_runs(route);
CREATE INDEX IF NOT EXISTS orchestrator_runs_safety_level_idx ON orchestrator_runs(safety_level);

CREATE INDEX IF NOT EXISTS orchestrator_artifacts_run_id_idx ON orchestrator_artifacts(run_id);
CREATE INDEX IF NOT EXISTS orchestrator_artifacts_profile_id_idx ON orchestrator_artifacts(profile_id);
CREATE INDEX IF NOT EXISTS orchestrator_artifacts_type_idx ON orchestrator_artifacts(artifact_type);
CREATE INDEX IF NOT EXISTS orchestrator_artifacts_expires_at_idx ON orchestrator_artifacts(expires_at);

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
