CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------
-- Enterprise governance tables
-- -----------------------------
CREATE TABLE IF NOT EXISTS public.tenant_sso_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id uuid NOT NULL,
  school_id uuid NULL,
  allowed_providers text[] NOT NULL DEFAULT '{}'::text[],
  allowed_domains text[] NOT NULL DEFAULT '{}'::text[],
  require_sso boolean NOT NULL DEFAULT false,
  enforcement_mode text NOT NULL DEFAULT 'optional',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS tenant_sso_settings_scope_idx
  ON public.tenant_sso_settings(district_id, school_id);
CREATE INDEX IF NOT EXISTS tenant_sso_settings_district_idx
  ON public.tenant_sso_settings(district_id);
CREATE INDEX IF NOT EXISTS tenant_sso_settings_school_idx
  ON public.tenant_sso_settings(school_id);

CREATE TABLE IF NOT EXISTS public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id uuid NOT NULL,
  school_id uuid NULL,
  key text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  description text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS feature_flags_scope_key_idx
  ON public.feature_flags(district_id, school_id, key);
CREATE INDEX IF NOT EXISTS feature_flags_district_idx
  ON public.feature_flags(district_id);
CREATE INDEX IF NOT EXISTS feature_flags_school_idx
  ON public.feature_flags(school_id);

CREATE TABLE IF NOT EXISTS public.ai_policy_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  summary text NULL,
  content text NOT NULL,
  links jsonb NOT NULL DEFAULT '[]'::jsonb,
  published_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  district_id uuid NULL,
  school_id uuid NULL,
  actor_id uuid NULL,
  model text NOT NULL,
  prompt_hash text NOT NULL,
  response_hash text NOT NULL,
  status text NOT NULL DEFAULT 'logged',
  flagged boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  reviewer_id uuid NULL,
  reviewed_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS ai_usage_logs_created_idx
  ON public.ai_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS ai_usage_logs_actor_idx
  ON public.ai_usage_logs(actor_id);
CREATE INDEX IF NOT EXISTS ai_usage_logs_district_idx
  ON public.ai_usage_logs(district_id);

CREATE TABLE IF NOT EXISTS public.ai_review_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usage_log_id uuid NOT NULL REFERENCES public.ai_usage_logs(id) ON DELETE CASCADE,
  district_id uuid NULL,
  school_id uuid NULL,
  status text NOT NULL DEFAULT 'pending',
  reason text NULL,
  reviewer_id uuid NULL,
  reviewed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_review_queue_status_idx
  ON public.ai_review_queue(status);
CREATE INDEX IF NOT EXISTS ai_review_queue_district_idx
  ON public.ai_review_queue(district_id);

CREATE TABLE IF NOT EXISTS public.sis_rosters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id uuid NOT NULL,
  school_id uuid NULL,
  roster_type text NOT NULL,
  source text NOT NULL,
  external_id text NULL,
  status text NOT NULL DEFAULT 'active',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  checksum text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sis_rosters_scope_idx
  ON public.sis_rosters(district_id, school_id, roster_type);
CREATE INDEX IF NOT EXISTS sis_rosters_external_idx
  ON public.sis_rosters(external_id);

-- -----------------------------
-- Updated-at triggers
-- -----------------------------
DROP TRIGGER IF EXISTS set_updated_at_tenant_sso_settings ON public.tenant_sso_settings;
CREATE TRIGGER set_updated_at_tenant_sso_settings
BEFORE UPDATE ON public.tenant_sso_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_feature_flags ON public.feature_flags;
CREATE TRIGGER set_updated_at_feature_flags
BEFORE UPDATE ON public.feature_flags
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_ai_policy_docs ON public.ai_policy_docs;
CREATE TRIGGER set_updated_at_ai_policy_docs
BEFORE UPDATE ON public.ai_policy_docs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_ai_review_queue ON public.ai_review_queue;
CREATE TRIGGER set_updated_at_ai_review_queue
BEFORE UPDATE ON public.ai_review_queue
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_sis_rosters ON public.sis_rosters;
CREATE TRIGGER set_updated_at_sis_rosters
BEFORE UPDATE ON public.sis_rosters
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------
-- Audit log immutability
-- -----------------------------
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

-- -----------------------------
-- Audit log helper
-- -----------------------------
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
  profile public.user_profiles;
  actor uuid := public.current_hasura_user_id();
BEGIN
  SELECT * INTO profile FROM public.current_user_profile();

  INSERT INTO public.audit_log (actor_id, action, entity_type, entity_id, metadata, district_id, school_id)
  VALUES (
    actor,
    p_action,
    p_entity_type,
    p_entity_id,
    COALESCE(p_metadata, '{}'::jsonb),
    profile.district_id,
    profile.school_id
  );
EXCEPTION WHEN undefined_table THEN
  NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_log_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.log_audit_event(
    TG_OP,
    TG_TABLE_NAME,
    NEW.id,
    jsonb_build_object('row', to_jsonb(NEW))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_log_tenant_sso_settings ON public.tenant_sso_settings;
CREATE TRIGGER audit_log_tenant_sso_settings
AFTER INSERT OR UPDATE ON public.tenant_sso_settings
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

DROP TRIGGER IF EXISTS audit_log_feature_flags ON public.feature_flags;
CREATE TRIGGER audit_log_feature_flags
AFTER INSERT OR UPDATE ON public.feature_flags
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

DROP TRIGGER IF EXISTS audit_log_ai_policy_docs ON public.ai_policy_docs;
CREATE TRIGGER audit_log_ai_policy_docs
AFTER INSERT OR UPDATE ON public.ai_policy_docs
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

DROP TRIGGER IF EXISTS audit_log_ai_review_queue ON public.ai_review_queue;
CREATE TRIGGER audit_log_ai_review_queue
AFTER INSERT OR UPDATE ON public.ai_review_queue
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

DROP TRIGGER IF EXISTS audit_log_sis_rosters ON public.sis_rosters;
CREATE TRIGGER audit_log_sis_rosters
AFTER INSERT OR UPDATE ON public.sis_rosters
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- -----------------------------
-- Seed AI transparency docs
-- -----------------------------
INSERT INTO public.ai_policy_docs (slug, title, summary, content, links, published_at)
VALUES
  (
    'ai-purpose-and-ethics',
    'AI Purpose and Ethical Framework',
    'How Teachmo deploys AI responsibly to support educators, caregivers, and students.',
    'Teachmo uses AI to reduce administrative burden, personalize learning insights, and support staff workflows. AI outputs are advisory and require human review for high-impact decisions. We prioritize transparency, fairness, privacy, and safety through documented policies, monitoring, and human oversight.',
    '["https://teachmo.com/ai/ethics"]'::jsonb,
    now()
  ),
  (
    'human-review-and-accountability',
    'Human Review and Accountability',
    'Human-in-the-loop moderation ensures AI outputs remain aligned with district policy and student safety.',
    'AI-generated content is reviewed when flagged by policy thresholds, safety heuristics, or manual escalation. Review decisions are logged to support accountability, auditability, and continuous improvement. District leaders can export review records at any time.',
    '["https://teachmo.com/ai/review"]'::jsonb,
    now()
  )
ON CONFLICT (slug) DO NOTHING;
