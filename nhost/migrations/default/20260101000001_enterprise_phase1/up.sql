CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------
-- Profiles upgrades
-- -----------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'UTC';

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------
-- Messaging schema alignment
-- -----------------------------
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS body text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_interaction_id uuid,
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hidden_by uuid NULL,
  ADD COLUMN IF NOT EXISTS hidden_reason text NULL,
  ADD COLUMN IF NOT EXISTS hidden_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS is_redacted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS redacted_by uuid NULL,
  ADD COLUMN IF NOT EXISTS redacted_reason text NULL,
  ADD COLUMN IF NOT EXISTS redacted_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_by uuid NULL,
  ADD COLUMN IF NOT EXISTS deleted_reason text NULL,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz NOT NULL DEFAULT now();

UPDATE public.messages
SET body = content
WHERE body IS NULL AND content IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'messages'
      AND constraint_name = 'messages_hidden_by_fkey'
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_hidden_by_fkey
      FOREIGN KEY (hidden_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'messages'
      AND constraint_name = 'messages_redacted_by_fkey'
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_redacted_by_fkey
      FOREIGN KEY (redacted_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'messages'
      AND constraint_name = 'messages_deleted_by_fkey'
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_deleted_by_fkey
      FOREIGN KEY (deleted_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'ai_interactions'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'messages'
      AND constraint_name = 'messages_ai_interaction_fkey'
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_ai_interaction_fkey
      FOREIGN KEY (ai_interaction_id) REFERENCES public.ai_interactions(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.message_thread_participants (
  thread_id uuid NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT message_thread_participants_unique UNIQUE (thread_id, user_id)
);

CREATE INDEX IF NOT EXISTS mtp_thread_id_idx ON public.message_thread_participants(thread_id);
CREATE INDEX IF NOT EXISTS mtp_user_id_idx ON public.message_thread_participants(user_id);

CREATE OR REPLACE FUNCTION public.sync_thread_participant_to_message_thread_participants()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.message_thread_participants (thread_id, user_id, role)
  SELECT NEW.thread_id, p.user_id, 'member'
  FROM public.profiles p
  WHERE p.id = NEW.profile_id
  ON CONFLICT (thread_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'thread_participants'
  ) THEN
    DROP TRIGGER IF EXISTS sync_thread_participants ON public.thread_participants;
    CREATE TRIGGER sync_thread_participants
    AFTER INSERT ON public.thread_participants
    FOR EACH ROW EXECUTE FUNCTION public.sync_thread_participant_to_message_thread_participants();
  END IF;
END $$;

-- -----------------------------
-- Calendar improvements
-- -----------------------------
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS all_day boolean NOT NULL DEFAULT false;

CREATE OR REPLACE VIEW public.calendar_events AS
SELECT
  e.id,
  e.school_id,
  e.classroom_id,
  e.title,
  e.description,
  e.location,
  e.starts_at,
  e.ends_at,
  e.all_day,
  e.created_by,
  e.created_at,
  e.updated_at
FROM public.events e;

-- -----------------------------
-- Immutable audit logs
-- -----------------------------
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

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

CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_actor_id_idx ON public.audit_log(actor_id);
CREATE INDEX IF NOT EXISTS audit_log_entity_idx ON public.audit_log(entity_type, entity_id);

-- -----------------------------
-- Per-tenant feature flags
-- -----------------------------
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  school_id uuid NULL,
  key text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  description text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_flags
  ADD COLUMN IF NOT EXISTS organization_id uuid;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'feature_flags'
      AND column_name = 'district_id'
  ) THEN
    UPDATE public.feature_flags
    SET organization_id = COALESCE(organization_id, district_id)
    WHERE organization_id IS NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS feature_flags_org_school_key_idx
  ON public.feature_flags(organization_id, school_id, key);

CREATE UNIQUE INDEX IF NOT EXISTS feature_flags_org_key_unique_idx
  ON public.feature_flags(organization_id, key)
  WHERE school_id IS NULL;

CREATE INDEX IF NOT EXISTS feature_flags_org_idx ON public.feature_flags(organization_id);

-- -----------------------------
-- SSO per tenant
-- -----------------------------
CREATE TABLE IF NOT EXISTS public.tenant_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  domain text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  verified_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, domain)
);

CREATE TABLE IF NOT EXISTS public.enterprise_sso_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider text NOT NULL,
  client_id text NULL,
  client_secret text NULL,
  issuer text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, provider)
);

DROP TRIGGER IF EXISTS tenant_domains_updated_at ON public.tenant_domains;
CREATE TRIGGER tenant_domains_updated_at
BEFORE UPDATE ON public.tenant_domains
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS enterprise_sso_settings_updated_at ON public.enterprise_sso_settings;
CREATE TRIGGER enterprise_sso_settings_updated_at
BEFORE UPDATE ON public.enterprise_sso_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------
-- Notifications
-- -----------------------------
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS organization_id uuid,
  ADD COLUMN IF NOT EXISTS profile_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'notifications'
      AND constraint_name = 'notifications_profile_fkey'
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_profile_fkey
      FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

UPDATE public.notifications n
SET
  profile_id = COALESCE(n.profile_id, p.id),
  organization_id = COALESCE(n.organization_id, p.organization_id)
FROM public.profiles p
WHERE p.user_id = n.user_id
  AND (n.profile_id IS NULL OR n.organization_id IS NULL);

CREATE INDEX IF NOT EXISTS notifications_org_idx ON public.notifications(organization_id);
CREATE INDEX IF NOT EXISTS notifications_profile_idx ON public.notifications(profile_id);

-- -----------------------------
-- SIS roster sync v1
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

CREATE TABLE IF NOT EXISTS public.sis_roster_teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.sis_import_jobs(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  school_id uuid NULL,
  external_id text NOT NULL,
  first_name text NULL,
  last_name text NULL,
  email text NULL,
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

CREATE INDEX IF NOT EXISTS sis_roster_students_job_idx ON public.sis_roster_students(job_id);
CREATE INDEX IF NOT EXISTS sis_roster_teachers_job_idx ON public.sis_roster_teachers(job_id);
CREATE INDEX IF NOT EXISTS sis_roster_classes_job_idx ON public.sis_roster_classes(job_id);
CREATE INDEX IF NOT EXISTS sis_roster_enrollments_job_idx ON public.sis_roster_enrollments(job_id);

-- -----------------------------
-- AI governance foundations
-- -----------------------------
ALTER TABLE public.ai_usage_logs
  ADD COLUMN IF NOT EXISTS organization_id uuid,
  ADD COLUMN IF NOT EXISTS school_id uuid,
  ADD COLUMN IF NOT EXISTS payload jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.ai_review_queue
  ADD COLUMN IF NOT EXISTS organization_id uuid,
  ADD COLUMN IF NOT EXISTS school_id uuid;

CREATE TABLE IF NOT EXISTS public.ai_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NULL,
  school_id uuid NULL,
  key text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  title text NULL,
  content text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, school_id, key, version)
);

CREATE TABLE IF NOT EXISTS public.knowledge_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  summary text NULL,
  content text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_at timestamptz NULL,
  organization_id uuid NULL,
  school_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS ai_prompts_updated_at ON public.ai_prompts;
CREATE TRIGGER ai_prompts_updated_at
BEFORE UPDATE ON public.ai_prompts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS knowledge_articles_updated_at ON public.knowledge_articles;
CREATE TRIGGER knowledge_articles_updated_at
BEFORE UPDATE ON public.knowledge_articles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE VIEW public.ai_usage_log AS
SELECT * FROM public.ai_usage_logs;

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
