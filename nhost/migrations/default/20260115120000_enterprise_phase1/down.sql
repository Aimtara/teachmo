DROP TRIGGER IF EXISTS audit_log_sis_rosters ON public.sis_rosters;
DROP TRIGGER IF EXISTS audit_log_ai_review_queue ON public.ai_review_queue;
DROP TRIGGER IF EXISTS audit_log_ai_policy_docs ON public.ai_policy_docs;
DROP TRIGGER IF EXISTS audit_log_feature_flags ON public.feature_flags;
DROP TRIGGER IF EXISTS audit_log_tenant_sso_settings ON public.tenant_sso_settings;

DROP FUNCTION IF EXISTS public.audit_log_trigger();
DROP FUNCTION IF EXISTS public.log_audit_event(text, text, uuid, jsonb);

DROP TRIGGER IF EXISTS prevent_audit_log_mutation ON public.audit_log;
DROP FUNCTION IF EXISTS public.prevent_audit_log_mutation();

DROP TRIGGER IF EXISTS set_updated_at_sis_rosters ON public.sis_rosters;
DROP TRIGGER IF EXISTS set_updated_at_ai_review_queue ON public.ai_review_queue;
DROP TRIGGER IF EXISTS set_updated_at_ai_policy_docs ON public.ai_policy_docs;
DROP TRIGGER IF EXISTS set_updated_at_feature_flags ON public.feature_flags;
DROP TRIGGER IF EXISTS set_updated_at_tenant_sso_settings ON public.tenant_sso_settings;

DROP TABLE IF EXISTS public.sis_rosters;
DROP TABLE IF EXISTS public.ai_review_queue;
DROP TABLE IF EXISTS public.ai_usage_logs;
DROP TABLE IF EXISTS public.ai_policy_docs;
DROP TABLE IF EXISTS public.feature_flags;
DROP TABLE IF EXISTS public.tenant_sso_settings;
