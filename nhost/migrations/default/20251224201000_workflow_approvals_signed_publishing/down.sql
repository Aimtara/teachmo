-- Rollback for workflow approvals + signed publishing

ALTER TABLE IF EXISTS public.workflow_run_steps
  DROP COLUMN IF EXISTS created_at;

DROP TABLE IF EXISTS public.workflow_publication_audits;

ALTER TABLE IF EXISTS public.workflow_definitions
  DROP COLUMN IF EXISTS review_requested_at,
  DROP COLUMN IF EXISTS review_requested_by,
  DROP COLUMN IF EXISTS approved_at,
  DROP COLUMN IF EXISTS approved_by,
  DROP COLUMN IF EXISTS published_version,
  DROP COLUMN IF EXISTS published_at,
  DROP COLUMN IF EXISTS published_by;
