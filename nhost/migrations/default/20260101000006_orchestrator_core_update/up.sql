CREATE TABLE IF NOT EXISTS public.orchestrator_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id text NOT NULL,
  user_id uuid,
  role text,
  channel text,
  route text,
  confidence double precision,
  missing_context jsonb,
  safety_level text,
  safety_reasons jsonb,
  success boolean NOT NULL DEFAULT false,
  latency_ms integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orchestrator_runs_request_id_idx ON public.orchestrator_runs (request_id);
ALTER TABLE IF EXISTS public.orchestrator_runs ADD COLUMN IF NOT EXISTS request_id text;
ALTER TABLE IF EXISTS public.orchestrator_runs ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE IF EXISTS public.orchestrator_runs ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE IF EXISTS public.orchestrator_runs ADD COLUMN IF NOT EXISTS channel text;
ALTER TABLE IF EXISTS public.orchestrator_runs ADD COLUMN IF NOT EXISTS route text;
ALTER TABLE IF EXISTS public.orchestrator_runs ADD COLUMN IF NOT EXISTS confidence double precision;
ALTER TABLE IF EXISTS public.orchestrator_runs ADD COLUMN IF NOT EXISTS missing_context jsonb;
ALTER TABLE IF EXISTS public.orchestrator_runs ADD COLUMN IF NOT EXISTS safety_level text;
ALTER TABLE IF EXISTS public.orchestrator_runs ADD COLUMN IF NOT EXISTS safety_reasons jsonb;
ALTER TABLE IF EXISTS public.orchestrator_runs ADD COLUMN IF NOT EXISTS success boolean DEFAULT false;
ALTER TABLE IF EXISTS public.orchestrator_runs ADD COLUMN IF NOT EXISTS latency_ms integer;

ALTER TABLE IF EXISTS public.orchestrator_artifacts ADD COLUMN IF NOT EXISTS run_id uuid;
ALTER TABLE IF EXISTS public.orchestrator_artifacts ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE IF EXISTS public.orchestrator_artifacts ADD COLUMN IF NOT EXISTS payload jsonb;
ALTER TABLE IF EXISTS public.orchestrator_artifacts ADD COLUMN IF NOT EXISTS expires_at timestamptz;
CREATE INDEX IF NOT EXISTS orchestrator_runs_user_id_idx ON public.orchestrator_runs (user_id);
CREATE INDEX IF NOT EXISTS orchestrator_runs_created_at_idx ON public.orchestrator_runs (created_at);

DROP TRIGGER IF EXISTS orchestrator_runs_updated_at ON public.orchestrator_runs;
CREATE TRIGGER orchestrator_runs_updated_at
BEFORE UPDATE ON public.orchestrator_runs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.orchestrator_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.orchestrator_runs(id) ON DELETE CASCADE,
  type text NOT NULL,
  payload jsonb NOT NULL,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orchestrator_artifacts_run_id_idx ON public.orchestrator_artifacts (run_id);
CREATE INDEX IF NOT EXISTS orchestrator_artifacts_type_idx ON public.orchestrator_artifacts (type);
CREATE INDEX IF NOT EXISTS orchestrator_artifacts_expires_at_idx ON public.orchestrator_artifacts (expires_at);

DROP TRIGGER IF EXISTS orchestrator_artifacts_updated_at ON public.orchestrator_artifacts;
CREATE TRIGGER orchestrator_artifacts_updated_at
BEFORE UPDATE ON public.orchestrator_artifacts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
