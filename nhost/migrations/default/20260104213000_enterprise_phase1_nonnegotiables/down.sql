DROP FUNCTION IF EXISTS auth.jwt_custom_claims(uuid);

DROP INDEX IF EXISTS ai_review_queue_org_idx;
DROP INDEX IF EXISTS ai_usage_logs_org_idx;
DROP INDEX IF EXISTS ai_policy_docs_org_idx;

ALTER TABLE public.ai_review_queue
  DROP COLUMN IF EXISTS organization_id;

ALTER TABLE public.ai_usage_logs
  DROP COLUMN IF EXISTS organization_id,
  DROP COLUMN IF EXISTS payload;

ALTER TABLE public.ai_policy_docs
  DROP COLUMN IF EXISTS organization_id,
  DROP COLUMN IF EXISTS school_id;

DROP TABLE IF EXISTS public.sis_roster_enrollments;
DROP TABLE IF EXISTS public.sis_roster_classes;
DROP TABLE IF EXISTS public.sis_roster_students;
DROP TABLE IF EXISTS public.sis_roster_users;
DROP TABLE IF EXISTS public.sis_import_jobs;

DROP INDEX IF EXISTS feature_flags_org_scope_key_idx;
DROP INDEX IF EXISTS feature_flags_org_idx;

ALTER TABLE public.feature_flags
  DROP COLUMN IF EXISTS organization_id;

DROP TABLE IF EXISTS public.enterprise_configs;

DROP INDEX IF EXISTS audit_log_school_id_idx;
DROP INDEX IF EXISTS audit_log_organization_id_idx;

ALTER TABLE public.audit_log
  DROP COLUMN IF EXISTS organization_id,
  DROP COLUMN IF EXISTS school_id;
