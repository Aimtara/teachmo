-- Enterprise Phase 5: Analytics (event_ts/metadata), Tenant Settings, Workflows, Partner Portal persistence

-- Safety: required extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------
-- Helper functions for DB-level RLS using Hasura session variables
-- -----------------------------
CREATE OR REPLACE FUNCTION public.current_hasura_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(NULLIF(current_setting('hasura.user', true), '')::jsonb ->> 'x-hasura-user-id', '')::uuid
$$;

CREATE OR REPLACE FUNCTION public.current_hasura_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(NULLIF(current_setting('hasura.user', true), '')::jsonb ->> 'x-hasura-role', '')
$$;

CREATE OR REPLACE FUNCTION public.current_user_profile()
RETURNS public.user_profiles
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM public.user_profiles
  WHERE user_id = (public.current_hasura_user_id())::uuid
$$;

-- -----------------------------
-- Analytics Events
-- -----------------------------
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  event_ts timestamptz NOT NULL DEFAULT now(),
  actor_user_id uuid NULL,
  district_id uuid NULL,
  school_id uuid NULL,
  entity_type text NULL,
  entity_id uuid NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analytics_events_ts_idx ON public.analytics_events(event_ts DESC);
CREATE INDEX IF NOT EXISTS analytics_events_name_ts_idx ON public.analytics_events(event_name, event_ts DESC);
CREATE INDEX IF NOT EXISTS analytics_events_actor_idx ON public.analytics_events(actor_user_id);
CREATE INDEX IF NOT EXISTS analytics_events_district_idx ON public.analytics_events(district_id);
CREATE INDEX IF NOT EXISTS analytics_events_school_idx ON public.analytics_events(school_id);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Select: admins see tenant rows; teachers/parents see their own
DROP POLICY IF EXISTS analytics_events_select ON public.analytics_events;
CREATE POLICY analytics_events_select ON public.analytics_events
FOR SELECT
USING (
  public.current_hasura_role() IN ('admin', 'system_admin')
  OR (
    public.current_hasura_role() = 'district_admin'
    AND district_id IS NOT NULL
    AND district_id = (SELECT district_id FROM public.current_user_profile())
  )
  OR (
    public.current_hasura_role() = 'school_admin'
    AND school_id IS NOT NULL
    AND school_id = (SELECT school_id FROM public.current_user_profile())
  )
  OR (
    actor_user_id IS NOT NULL
    AND actor_user_id = (public.current_hasura_user_id())::uuid
  )
);

-- Insert: allow self-instrumentation only within current tenant scope
DROP POLICY IF EXISTS analytics_events_insert ON public.analytics_events;
CREATE POLICY analytics_events_insert ON public.analytics_events
FOR INSERT
WITH CHECK (
  actor_user_id IS NOT NULL
  AND actor_user_id = (public.current_hasura_user_id())::uuid
  AND (
    district_id IS NULL OR district_id = (SELECT district_id FROM public.current_user_profile())
  )
  AND (
    school_id IS NULL OR school_id = (SELECT school_id FROM public.current_user_profile())
  )
);

-- Update/Delete: admins only
DROP POLICY IF EXISTS analytics_events_modify_admin ON public.analytics_events;
CREATE POLICY analytics_events_modify_admin ON public.analytics_events
FOR UPDATE
USING (public.current_hasura_role() IN ('admin', 'system_admin'))
WITH CHECK (public.current_hasura_role() IN ('admin', 'system_admin'));

DROP POLICY IF EXISTS analytics_events_delete_admin ON public.analytics_events;
CREATE POLICY analytics_events_delete_admin ON public.analytics_events
FOR DELETE
USING (public.current_hasura_role() IN ('admin', 'system_admin'));

-- Rollup view: daily counts
CREATE OR REPLACE VIEW public.analytics_event_rollups_daily AS
SELECT
  date_trunc('day', event_ts)::date AS day,
  event_name,
  district_id,
  school_id,
  count(*)::bigint AS event_count
FROM public.analytics_events
GROUP BY 1,2,3,4;

-- -----------------------------
-- AI Interactions (prompt/response logs)
-- -----------------------------
CREATE TABLE IF NOT EXISTS public.ai_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_user_id uuid NULL,
  district_id uuid NULL,
  school_id uuid NULL,
  model text NULL,
  prompt text NOT NULL,
  response text NOT NULL,
  prompt_tokens int NULL,
  completion_tokens int NULL,
  total_tokens int NULL,
  hallucination_score numeric NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS ai_interactions_ts_idx ON public.ai_interactions(created_at DESC);
CREATE INDEX IF NOT EXISTS ai_interactions_actor_idx ON public.ai_interactions(actor_user_id);
CREATE INDEX IF NOT EXISTS ai_interactions_district_idx ON public.ai_interactions(district_id);
CREATE INDEX IF NOT EXISTS ai_interactions_school_idx ON public.ai_interactions(school_id);

ALTER TABLE public.ai_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_interactions_select ON public.ai_interactions;
CREATE POLICY ai_interactions_select ON public.ai_interactions
FOR SELECT
USING (
  public.current_hasura_role() IN ('admin', 'system_admin')
  OR (
    public.current_hasura_role() = 'district_admin'
    AND district_id IS NOT NULL
    AND district_id = (SELECT district_id FROM public.current_user_profile())
  )
  OR (
    public.current_hasura_role() = 'school_admin'
    AND school_id IS NOT NULL
    AND school_id = (SELECT school_id FROM public.current_user_profile())
  )
  OR (
    actor_user_id IS NOT NULL
    AND actor_user_id = (public.current_hasura_user_id())::uuid
  )
);

DROP POLICY IF EXISTS ai_interactions_insert ON public.ai_interactions;
CREATE POLICY ai_interactions_insert ON public.ai_interactions
FOR INSERT
WITH CHECK (
  actor_user_id IS NOT NULL
  AND actor_user_id = (public.current_hasura_user_id())::uuid
  AND (
    district_id IS NULL OR district_id = (SELECT district_id FROM public.current_user_profile())
  )
  AND (
    school_id IS NULL OR school_id = (SELECT school_id FROM public.current_user_profile())
  )
);

-- -----------------------------
-- Tenant Settings (branding + tenant config)
-- -----------------------------
CREATE TABLE IF NOT EXISTS public.tenant_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id uuid NOT NULL,
  school_id uuid NULL,
  name text NULL,
  branding jsonb NOT NULL DEFAULT '{}'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS tenant_settings_district_unique
  ON public.tenant_settings(district_id)
  WHERE school_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS tenant_settings_school_unique
  ON public.tenant_settings(district_id, school_id)
  WHERE school_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS tenant_settings_school_idx ON public.tenant_settings(school_id);

ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_settings_select ON public.tenant_settings;
CREATE POLICY tenant_settings_select ON public.tenant_settings
FOR SELECT
USING (
  public.current_hasura_role() IN ('admin', 'system_admin')
  OR (
    public.current_hasura_role() = 'district_admin'
    AND district_id = (SELECT district_id FROM public.current_user_profile())
    AND school_id IS NULL
  )
  OR (
    public.current_hasura_role() = 'school_admin'
    AND school_id = (SELECT school_id FROM public.current_user_profile())
  )
);

DROP POLICY IF EXISTS tenant_settings_modify ON public.tenant_settings;
CREATE POLICY tenant_settings_modify ON public.tenant_settings
FOR UPDATE
USING (
  public.current_hasura_role() IN ('admin', 'system_admin')
  OR (
    public.current_hasura_role() = 'district_admin'
    AND district_id = (SELECT district_id FROM public.current_user_profile())
    AND school_id IS NULL
  )
  OR (
    public.current_hasura_role() = 'school_admin'
    AND school_id = (SELECT school_id FROM public.current_user_profile())
  )
)
WITH CHECK (
  public.current_hasura_role() IN ('admin', 'system_admin')
  OR (
    public.current_hasura_role() = 'district_admin'
    AND district_id = (SELECT district_id FROM public.current_user_profile())
    AND school_id IS NULL
  )
  OR (
    public.current_hasura_role() = 'school_admin'
    AND school_id = (SELECT school_id FROM public.current_user_profile())
  )
);

DROP POLICY IF EXISTS tenant_settings_insert ON public.tenant_settings;
CREATE POLICY tenant_settings_insert ON public.tenant_settings
FOR INSERT
WITH CHECK (
  public.current_hasura_role() IN ('admin', 'system_admin')
  OR (
    public.current_hasura_role() = 'district_admin'
    AND district_id = (SELECT district_id FROM public.current_user_profile())
    AND school_id IS NULL
  )
  OR (
    public.current_hasura_role() = 'school_admin'
    AND school_id = (SELECT school_id FROM public.current_user_profile())
  )
);

-- -----------------------------
-- Workflows (definitions + runs) (minimal execution; future-grade for real actions)
-- -----------------------------
CREATE TABLE IF NOT EXISTS public.workflow_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  trigger jsonb NOT NULL DEFAULT '{}'::jsonb,
  definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  version int NOT NULL DEFAULT 1,
  created_by uuid NULL,
  district_id uuid NULL,
  school_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workflow_definitions_tenant_idx ON public.workflow_definitions(district_id, school_id);
CREATE INDEX IF NOT EXISTS workflow_definitions_status_idx ON public.workflow_definitions(status);

CREATE TABLE IF NOT EXISTS public.workflow_definition_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.workflow_definitions(id) ON DELETE CASCADE,
  version int NOT NULL,
  trigger jsonb NOT NULL DEFAULT '{}'::jsonb,
  definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workflow_id, version)
);

CREATE TABLE IF NOT EXISTS public.workflow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.workflow_definitions(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'running',
  actor_user_id uuid NULL,
  district_id uuid NULL,
  school_id uuid NULL,
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  output jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS workflow_runs_workflow_idx ON public.workflow_runs(workflow_id, started_at DESC);

CREATE TABLE IF NOT EXISTS public.workflow_run_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.workflow_runs(id) ON DELETE CASCADE,
  step_key text NOT NULL,
  status text NOT NULL DEFAULT 'planned',
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  output jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text NULL,
  started_at timestamptz NULL,
  finished_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS workflow_run_steps_run_idx ON public.workflow_run_steps(run_id);

-- Versioning trigger: whenever workflow definition changes, snapshot into versions and bump version
CREATE OR REPLACE FUNCTION public.snapshot_workflow_definition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.workflow_definition_versions(workflow_id, version, trigger, definition, created_by)
    VALUES (NEW.id, NEW.version, NEW.trigger, NEW.definition, NEW.created_by);
    RETURN NEW;
  END IF;

  IF (TG_OP = 'UPDATE') THEN
    IF (NEW.definition IS DISTINCT FROM OLD.definition) OR (NEW.trigger IS DISTINCT FROM OLD.trigger) THEN
      NEW.version := OLD.version + 1;
      INSERT INTO public.workflow_definition_versions(workflow_id, version, trigger, definition, created_by)
      VALUES (NEW.id, NEW.version, NEW.trigger, NEW.definition, NEW.created_by);
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_snapshot_workflow_definition ON public.workflow_definitions;
CREATE TRIGGER trg_snapshot_workflow_definition
BEFORE INSERT OR UPDATE ON public.workflow_definitions
FOR EACH ROW
EXECUTE FUNCTION public.snapshot_workflow_definition();

ALTER TABLE public.workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_definition_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_run_steps ENABLE ROW LEVEL SECURITY;

-- Workflows: tenant admins can manage within scope
DROP POLICY IF EXISTS workflow_definitions_select ON public.workflow_definitions;
CREATE POLICY workflow_definitions_select ON public.workflow_definitions
FOR SELECT
USING (
  public.current_hasura_role() IN ('admin', 'system_admin')
  OR (
    public.current_hasura_role() = 'district_admin'
    AND district_id = (SELECT district_id FROM public.current_user_profile())
  )
  OR (
    public.current_hasura_role() = 'school_admin'
    AND school_id = (SELECT school_id FROM public.current_user_profile())
  )
);

DROP POLICY IF EXISTS workflow_definitions_modify ON public.workflow_definitions;
CREATE POLICY workflow_definitions_modify ON public.workflow_definitions
FOR UPDATE
USING (
  public.current_hasura_role() IN ('admin', 'system_admin')
  OR (
    public.current_hasura_role() = 'district_admin'
    AND district_id = (SELECT district_id FROM public.current_user_profile())
  )
  OR (
    public.current_hasura_role() = 'school_admin'
    AND school_id = (SELECT school_id FROM public.current_user_profile())
  )
)
WITH CHECK (
  public.current_hasura_role() IN ('admin', 'system_admin')
  OR (
    public.current_hasura_role() = 'district_admin'
    AND district_id = (SELECT district_id FROM public.current_user_profile())
  )
  OR (
    public.current_hasura_role() = 'school_admin'
    AND school_id = (SELECT school_id FROM public.current_user_profile())
  )
);

DROP POLICY IF EXISTS workflow_definitions_insert ON public.workflow_definitions;
CREATE POLICY workflow_definitions_insert ON public.workflow_definitions
FOR INSERT
WITH CHECK (
  public.current_hasura_role() IN ('admin', 'system_admin', 'district_admin', 'school_admin')
);

-- Runs: readable by tenant admins; steps inherit via join
DROP POLICY IF EXISTS workflow_runs_select ON public.workflow_runs;
CREATE POLICY workflow_runs_select ON public.workflow_runs
FOR SELECT
USING (
  public.current_hasura_role() IN ('admin', 'system_admin')
  OR (
    public.current_hasura_role() = 'district_admin'
    AND district_id = (SELECT district_id FROM public.current_user_profile())
  )
  OR (
    public.current_hasura_role() = 'school_admin'
    AND school_id = (SELECT school_id FROM public.current_user_profile())
  )
  OR (
    actor_user_id IS NOT NULL
    AND actor_user_id = (public.current_hasura_user_id())::uuid
  )
);

DROP POLICY IF EXISTS workflow_run_steps_select ON public.workflow_run_steps;
CREATE POLICY workflow_run_steps_select ON public.workflow_run_steps
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workflow_runs r
    WHERE r.id = workflow_run_steps.run_id
    AND (
      public.current_hasura_role() IN ('admin', 'system_admin')
      OR (public.current_hasura_role() = 'district_admin' AND r.district_id = (SELECT district_id FROM public.current_user_profile()))
      OR (public.current_hasura_role() = 'school_admin' AND r.school_id = (SELECT school_id FROM public.current_user_profile()))
      OR (r.actor_user_id IS NOT NULL AND r.actor_user_id = (public.current_hasura_user_id())::uuid)
    )
  )
);

-- -----------------------------
-- Partner portal persistence (replaces in-memory demo models)
-- -----------------------------
CREATE TABLE IF NOT EXISTS public.partner_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_user_id uuid NULL,
  district_id uuid NULL,
  type text NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  reason text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partner_submissions_tenant_idx ON public.partner_submissions(district_id, partner_user_id);

CREATE TABLE IF NOT EXISTS public.partner_incentive_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_user_id uuid NULL,
  district_id uuid NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payout jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partner_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_user_id uuid NULL,
  district_id uuid NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partner_onboarding_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id uuid NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partner_training_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id uuid NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partner_training_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.partner_training_courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  sort_order int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.partner_submission_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_ts timestamptz NOT NULL DEFAULT now(),
  district_id uuid NULL,
  admin_user_id uuid NULL,
  entity text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  reason text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS partner_submission_audits_ts_idx ON public.partner_submission_audits(event_ts DESC);


-- -----------------------------
-- Harden user_profiles with DB-level RLS for true tenant isolation
-- -----------------------------
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- A user can always read their own profile.
-- School/District admins can manage profiles in their scope.
DROP POLICY IF EXISTS user_profiles_select ON public.user_profiles;
CREATE POLICY user_profiles_select ON public.user_profiles
FOR SELECT
USING (
  user_id = (public.current_hasura_user_id())::uuid
  OR public.current_hasura_role() IN ('admin', 'system_admin')
  OR (
    public.current_hasura_role() = 'district_admin'
    AND district_id IS NOT NULL
    AND district_id = (SELECT district_id FROM public.current_user_profile())
  )
  OR (
    public.current_hasura_role() = 'school_admin'
    AND school_id IS NOT NULL
    AND school_id = (SELECT school_id FROM public.current_user_profile())
  )
);

DROP POLICY IF EXISTS user_profiles_insert ON public.user_profiles;
CREATE POLICY user_profiles_insert ON public.user_profiles
FOR INSERT
WITH CHECK (
  public.current_hasura_role() IN ('admin', 'system_admin')
  OR (
    public.current_hasura_role() = 'district_admin'
    AND district_id IS NOT NULL
    AND district_id = (SELECT district_id FROM public.current_user_profile())
  )
  OR (
    public.current_hasura_role() = 'school_admin'
    AND school_id IS NOT NULL
    AND school_id = (SELECT school_id FROM public.current_user_profile())
  )
);

DROP POLICY IF EXISTS user_profiles_update ON public.user_profiles;
CREATE POLICY user_profiles_update ON public.user_profiles
FOR UPDATE
USING (
  public.current_hasura_role() IN ('admin', 'system_admin')
  OR (
    public.current_hasura_role() = 'district_admin'
    AND district_id IS NOT NULL
    AND district_id = (SELECT district_id FROM public.current_user_profile())
  )
  OR (
    public.current_hasura_role() = 'school_admin'
    AND school_id IS NOT NULL
    AND school_id = (SELECT school_id FROM public.current_user_profile())
  )
)
WITH CHECK (
  public.current_hasura_role() IN ('admin', 'system_admin')
  OR (
    public.current_hasura_role() = 'district_admin'
    AND district_id IS NOT NULL
    AND district_id = (SELECT district_id FROM public.current_user_profile())
  )
  OR (
    public.current_hasura_role() = 'school_admin'
    AND school_id IS NOT NULL
    AND school_id = (SELECT school_id FROM public.current_user_profile())
  )
);


-- -----------------------------
-- Make analytics "alive" by auto-emitting analytics_events from existing audit_log writes
-- -----------------------------
CREATE OR REPLACE FUNCTION public.emit_analytics_event_from_audit_log()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  prof public.user_profiles;
BEGIN
  SELECT * INTO prof FROM public.user_profiles WHERE user_id = NEW.actor_id LIMIT 1;

  INSERT INTO public.analytics_events (
    event_name,
    event_ts,
    actor_user_id,
    district_id,
    school_id,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    'audit.' || COALESCE(NEW.action, 'unknown'),
    COALESCE(NEW.created_at, NOW()),
    NEW.actor_id,
    prof.district_id,
    prof.school_id,
    NEW.entity_type,
    NEW.entity_id,
    jsonb_build_object(
      'audit_id', NEW.id,
      'action', NEW.action,
      'source', 'audit_log_trigger'
    ) || COALESCE(NEW.metadata, '{}'::jsonb)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_log_emit_analytics_event ON public.audit_log;
CREATE TRIGGER trg_audit_log_emit_analytics_event
AFTER INSERT ON public.audit_log
FOR EACH ROW
EXECUTE FUNCTION public.emit_analytics_event_from_audit_log();
