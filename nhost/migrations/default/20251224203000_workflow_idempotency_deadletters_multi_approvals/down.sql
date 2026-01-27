DROP TABLE IF EXISTS public.workflow_approvals;
DROP TABLE IF EXISTS public.workflow_dead_letters;

DROP INDEX IF EXISTS public.workflow_runs_event_idx;
DROP INDEX IF EXISTS public.workflow_runs_idempotency_uniq;

ALTER TABLE IF EXISTS public.workflow_runs
  DROP COLUMN IF EXISTS idempotency_key,
  DROP COLUMN IF EXISTS event_id;
