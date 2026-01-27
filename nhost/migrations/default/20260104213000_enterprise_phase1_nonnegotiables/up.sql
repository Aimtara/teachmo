CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------
-- Audit log tenant scoping + immutability
-- -----------------------------
ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS organization_id uuid NULL,
  ADD COLUMN IF NOT EXISTS school_id uuid NULL;

UPDATE public.audit_log al
SET
  organization_id = COALESCE(al.organization_id, p.organization_id),
  school_id = COALESCE(al.school_id, p.school_id)
FROM public.profiles p
WHERE p.user_id = al.actor_id
  AND (al.organization_id IS NULL OR al.school_id IS NULL);

CREATE INDEX IF NOT EXISTS audit_log_organization_id_idx ON public.audit_log(organization_id);
CREATE INDEX IF NOT EXISTS audit_log_school_id_idx ON public.audit_log(school_id);

CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is immutable';
END;
$$;

DROP TRIGGER IF EXISTS prevent_audit_log_mutation ON public.audit_log;
CREATE TRIGGER prevent_audit_log_mutation
BEFORE UPDATE OR DELETE ON public.audit_log
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();

CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  profile public.profiles;
  actor uuid := public.current_hasura_user_id();
BEGIN
  SELECT * INTO profile FROM public.profiles WHERE user_id = actor;

  INSERT INTO public.audit_log (actor_id, action, entity_type, entity_id, metadata, organization_id, school_id)
  VALUES (
    actor,
    p_action,
    p_entity_type,
    p_entity_id,
    COALESCE(p_metadata, '{}'::jsonb),
    profile.organization_id,
    profile.school_id
  );
EXCEPTION WHEN undefined_table THEN
  NULL;
END;
$$;

-- -----------------------------
-- Enterprise configs + feature flags
-- -----------------------------
CREATE TABLE IF NOT EXISTS public.enterprise_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  school_id uuid NULL,
  require_sso boolean NOT NULL DEFAULT false,
  allowed_oauth_providers text[] NOT NULL DEFAULT ARRAY['google','azuread'],
  allowed_email_domains text[] NOT NULL DEFAULT '{}'::text[],
  security_policy jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, school_id)
);

DROP TRIGGER IF EXISTS set_updated_at_enterprise_configs ON public.enterprise_configs;
CREATE TRIGGER set_updated_at_enterprise_configs
BEFORE UPDATE ON public.enterprise_configs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.feature_flags
  ADD COLUMN IF NOT EXISTS organization_id uuid NULL;

CREATE INDEX IF NOT EXISTS feature_flags_org_idx ON public.feature_flags(organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS feature_flags_org_scope_key_idx
  ON public.feature_flags(organization_id, school_id, key);

-- -----------------------------
-- SIS roster import (v1 read-only)
-- -----------------------------
CREATE TABLE IF NOT EXISTS public.sis_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  school_id uuid NULL,
  roster_type text NOT NULL,
  source text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz NULL,
  finished_at timestamptz NULL,
  error text NULL
);

DROP TRIGGER IF EXISTS set_updated_at_sis_import_jobs ON public.sis_import_jobs;
CREATE TRIGGER set_updated_at_sis_import_jobs
BEFORE UPDATE ON public.sis_import_jobs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS sis_import_jobs_org_idx ON public.sis_import_jobs(organization_id);
CREATE INDEX IF NOT EXISTS sis_import_jobs_school_idx ON public.sis_import_jobs(school_id);
CREATE INDEX IF NOT EXISTS sis_import_jobs_status_idx ON public.sis_import_jobs(status);

CREATE TABLE IF NOT EXISTS public.sis_roster_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.sis_import_jobs(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  school_id uuid NULL,
  external_id text NOT NULL,
  email text NULL,
  full_name text NULL,
  role text NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sis_roster_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.sis_import_jobs(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  school_id uuid NULL,
  external_id text NOT NULL,
  first_name text NULL,
  last_name text NULL,
  grade text NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sis_roster_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.sis_import_jobs(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  school_id uuid NULL,
  external_id text NOT NULL,
  name text NULL,
  teacher_external_id text NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sis_roster_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.sis_import_jobs(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  school_id uuid NULL,
  class_external_id text NOT NULL,
  student_external_id text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sis_roster_users_job_idx ON public.sis_roster_users(job_id);
CREATE INDEX IF NOT EXISTS sis_roster_students_job_idx ON public.sis_roster_students(job_id);
CREATE INDEX IF NOT EXISTS sis_roster_classes_job_idx ON public.sis_roster_classes(job_id);
CREATE INDEX IF NOT EXISTS sis_roster_enrollments_job_idx ON public.sis_roster_enrollments(job_id);

-- -----------------------------
-- AI governance foundations
-- -----------------------------
ALTER TABLE public.ai_policy_docs
  ADD COLUMN IF NOT EXISTS organization_id uuid NULL,
  ADD COLUMN IF NOT EXISTS school_id uuid NULL;

ALTER TABLE public.ai_usage_logs
  ADD COLUMN IF NOT EXISTS organization_id uuid NULL,
  ADD COLUMN IF NOT EXISTS payload jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.ai_review_queue
  ADD COLUMN IF NOT EXISTS organization_id uuid NULL;

CREATE INDEX IF NOT EXISTS ai_policy_docs_org_idx ON public.ai_policy_docs(organization_id);
CREATE INDEX IF NOT EXISTS ai_usage_logs_org_idx ON public.ai_usage_logs(organization_id);
CREATE INDEX IF NOT EXISTS ai_review_queue_org_idx ON public.ai_review_queue(organization_id);

INSERT INTO public.ai_policy_docs (slug, title, summary, content, links, published_at, organization_id)
VALUES
  (
    'ai-transparency',
    'AI Transparency Overview',
    'Teachmo AI governance summary and transparency commitments.',
    'Teachmo uses AI to support educators and caregivers with human oversight. We document model usage, retain audit records, and provide clear escalation paths for review. This transparency statement is updated as policies evolve.',
    '[]'::jsonb,
    now(),
    NULL
  )
ON CONFLICT (slug) DO NOTHING;

-- -----------------------------
-- JWT custom claims (Hasura)
-- -----------------------------
CREATE OR REPLACE FUNCTION auth.jwt_custom_claims(user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'x-hasura-default-role', COALESCE(p.app_role, 'parent'),
    'x-hasura-allowed-roles',
      CASE
        WHEN COALESCE(p.app_role, 'parent') = 'system_admin'
          THEN ARRAY['system_admin','admin','district_admin','school_admin','teacher','parent','partner']::text[]
        ELSE ARRAY[COALESCE(p.app_role, 'parent')]::text[]
      END,
    'x-hasura-user-id', u.id::text,
    'x-hasura-profile-id', p.id::text,
    'x-hasura-organization-id', p.organization_id::text,
    'x-hasura-school-id', p.school_id::text
  )
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  WHERE u.id = user_id
$$;
