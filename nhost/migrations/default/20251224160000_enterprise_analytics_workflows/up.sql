CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.tenant_settings (
  organization_id uuid NOT NULL,
  school_id uuid NULL,
  branding jsonb NOT NULL DEFAULT '{}'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, school_id)
);

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  event_ts timestamptz NOT NULL DEFAULT now(),
  organization_id uuid NOT NULL,
  school_id uuid NULL,
  actor_id uuid NULL,
  actor_role text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'web',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analytics_events_org_idx ON public.analytics_events(organization_id);
CREATE INDEX IF NOT EXISTS analytics_events_school_idx ON public.analytics_events(school_id);
CREATE INDEX IF NOT EXISTS analytics_events_event_ts_idx ON public.analytics_events(event_ts);
CREATE INDEX IF NOT EXISTS analytics_events_event_name_idx ON public.analytics_events(event_name);

CREATE TABLE IF NOT EXISTS public.ai_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  school_id uuid NULL,
  actor_id uuid NULL,
  actor_role text NULL,
  child_id uuid NULL,
  prompt text NOT NULL,
  response text NOT NULL,
  token_prompt integer NULL,
  token_response integer NULL,
  token_total integer NULL,
  safety_risk_score numeric NULL,
  safety_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  model text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  latency_ms integer NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_interactions_org_idx ON public.ai_interactions(organization_id);
CREATE INDEX IF NOT EXISTS ai_interactions_school_idx ON public.ai_interactions(school_id);
CREATE INDEX IF NOT EXISTS ai_interactions_created_idx ON public.ai_interactions(created_at);

CREATE TABLE IF NOT EXISTS public.workflow_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  school_id uuid NULL,
  name text NOT NULL,
  description text NULL,
  definition jsonb NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NULL,
  updated_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workflow_definitions_org_idx ON public.workflow_definitions(organization_id);
CREATE INDEX IF NOT EXISTS workflow_definitions_school_idx ON public.workflow_definitions(school_id);

CREATE TABLE IF NOT EXISTS public.workflow_definition_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.workflow_definitions(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  definition jsonb NOT NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workflow_id, version_number)
);

CREATE INDEX IF NOT EXISTS workflow_definition_versions_workflow_idx ON public.workflow_definition_versions(workflow_id);

CREATE TABLE IF NOT EXISTS public.workflow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.workflow_definitions(id) ON DELETE CASCADE,
  workflow_version_id uuid NULL REFERENCES public.workflow_definition_versions(id) ON DELETE SET NULL,
  organization_id uuid NOT NULL,
  school_id uuid NULL,
  status text NOT NULL DEFAULT 'running',
  input jsonb NULL,
  output jsonb NULL,
  actor_id uuid NULL,
  actor_role text NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS workflow_runs_org_idx ON public.workflow_runs(organization_id);
CREATE INDEX IF NOT EXISTS workflow_runs_school_idx ON public.workflow_runs(school_id);
CREATE INDEX IF NOT EXISTS workflow_runs_workflow_idx ON public.workflow_runs(workflow_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_tenant_settings ON public.tenant_settings;
CREATE TRIGGER set_updated_at_tenant_settings
BEFORE UPDATE ON public.tenant_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_workflow_definitions ON public.workflow_definitions;
CREATE TRIGGER set_updated_at_workflow_definitions
BEFORE UPDATE ON public.workflow_definitions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.workflow_definition_versioning()
RETURNS trigger AS $$
DECLARE
  next_version integer;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO next_version
  FROM public.workflow_definition_versions
  WHERE workflow_id = NEW.id;

  INSERT INTO public.workflow_definition_versions (workflow_id, version_number, definition, created_by)
  VALUES (NEW.id, next_version, NEW.definition, COALESCE(NEW.updated_by, NEW.created_by));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS workflow_definition_versioning ON public.workflow_definitions;
CREATE TRIGGER workflow_definition_versioning
AFTER INSERT OR UPDATE OF definition ON public.workflow_definitions
FOR EACH ROW EXECUTE FUNCTION public.workflow_definition_versioning();
