DROP TRIGGER IF EXISTS workflow_definition_versioning ON public.workflow_definitions;
DROP FUNCTION IF EXISTS public.workflow_definition_versioning();

DROP TRIGGER IF EXISTS set_updated_at_workflow_definitions ON public.workflow_definitions;
DROP TRIGGER IF EXISTS set_updated_at_tenant_settings ON public.tenant_settings;
DROP FUNCTION IF EXISTS public.set_updated_at();

DROP TABLE IF EXISTS public.workflow_runs;
DROP TABLE IF EXISTS public.workflow_definition_versions;
DROP TABLE IF EXISTS public.workflow_definitions;
DROP TABLE IF EXISTS public.ai_interactions;
DROP TABLE IF EXISTS public.analytics_events;
DROP TABLE IF EXISTS public.tenant_settings;
