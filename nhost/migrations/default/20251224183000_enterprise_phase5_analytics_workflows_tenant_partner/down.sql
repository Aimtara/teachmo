-- Rollback for Enterprise Phase 5 objects

DROP VIEW IF EXISTS public.analytics_event_rollups_daily;

DROP TABLE IF EXISTS public.workflow_run_steps;
DROP TABLE IF EXISTS public.workflow_runs;
DROP TABLE IF EXISTS public.workflow_definition_versions;
DROP TABLE IF EXISTS public.workflow_definitions;

DROP TABLE IF EXISTS public.tenant_settings;

DROP TABLE IF EXISTS public.ai_interactions;
DROP TABLE IF EXISTS public.analytics_events;

DROP TABLE IF EXISTS public.partner_submission_audits;
DROP TABLE IF EXISTS public.partner_training_modules;
DROP TABLE IF EXISTS public.partner_training_courses;
DROP TABLE IF EXISTS public.partner_onboarding_tasks;
DROP TABLE IF EXISTS public.partner_contracts;
DROP TABLE IF EXISTS public.partner_incentive_applications;
DROP TABLE IF EXISTS public.partner_submissions;

DROP FUNCTION IF EXISTS public.current_hasura_role();
DROP FUNCTION IF EXISTS public.current_user_profile();
DROP FUNCTION IF EXISTS public.current_hasura_user_id();
DROP FUNCTION IF EXISTS public.current_user_profile_district_id();
DROP FUNCTION IF EXISTS public.current_user_profile_school_id();
DROP FUNCTION IF EXISTS public.is_system_like_admin();
DROP FUNCTION IF EXISTS public.is_district_admin();
DROP FUNCTION IF EXISTS public.is_school_admin();
DROP FUNCTION IF EXISTS public.is_authenticated();

DROP TRIGGER IF EXISTS trg_audit_log_emit_analytics_event ON public.audit_log;
DROP FUNCTION IF EXISTS public.emit_analytics_event_from_audit_log();
