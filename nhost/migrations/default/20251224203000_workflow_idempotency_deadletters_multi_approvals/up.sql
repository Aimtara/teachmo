-- Future-grade enterprise power (Patch 5)
-- - Workflow idempotency keys to prevent duplicate runs when events are retried
-- - Workflow dead-letter capture for step failures
-- - Multi-approver governance via workflow_approvals

-- 1) Workflow run idempotency
ALTER TABLE IF EXISTS public.workflow_runs
  ADD COLUMN IF NOT EXISTS event_id uuid,
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS workflow_runs_idempotency_uniq
  ON public.workflow_runs(workflow_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS workflow_runs_event_idx
  ON public.workflow_runs(event_id)
  WHERE event_id IS NOT NULL;

-- 2) Dead letters for step failures
CREATE TABLE IF NOT EXISTS public.workflow_dead_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.workflow_definitions(id) ON DELETE CASCADE,
  run_id uuid NULL REFERENCES public.workflow_runs(id) ON DELETE CASCADE,
  step_key text NOT NULL,
  actor_user_id uuid NULL,
  district_id uuid NULL,
  school_id uuid NULL,
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workflow_dead_letters_workflow_idx
  ON public.workflow_dead_letters(workflow_id, created_at DESC);

ALTER TABLE public.workflow_dead_letters ENABLE ROW LEVEL SECURITY;

-- Tenant-scoped select through workflow_definitions
DROP POLICY IF EXISTS workflow_dead_letters_select ON public.workflow_dead_letters;
CREATE POLICY workflow_dead_letters_select ON public.workflow_dead_letters
FOR SELECT
USING (
  public.current_hasura_role() IN ('admin','system_admin')
  OR EXISTS (
    SELECT 1
    FROM public.workflow_definitions w
    WHERE w.id = workflow_dead_letters.workflow_id
      AND (
        (public.current_hasura_role() = 'district_admin' AND w.district_id = (SELECT district_id FROM public.current_user_profile()))
        OR (public.current_hasura_role() = 'school_admin' AND w.school_id = (SELECT school_id FROM public.current_user_profile()))
      )
  )
);

DROP POLICY IF EXISTS workflow_dead_letters_insert ON public.workflow_dead_letters;
CREATE POLICY workflow_dead_letters_insert ON public.workflow_dead_letters
FOR INSERT
WITH CHECK (public.current_hasura_role() IN ('admin','system_admin','district_admin','school_admin'));

-- 3) Multi-approver governance
CREATE TABLE IF NOT EXISTS public.workflow_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.workflow_definitions(id) ON DELETE CASCADE,
  version int NOT NULL,
  approver_user_id uuid NOT NULL,
  reason text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workflow_id, version, approver_user_id)
);

CREATE INDEX IF NOT EXISTS workflow_approvals_workflow_version_idx
  ON public.workflow_approvals(workflow_id, version, created_at DESC);

ALTER TABLE public.workflow_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workflow_approvals_select ON public.workflow_approvals;
CREATE POLICY workflow_approvals_select ON public.workflow_approvals
FOR SELECT
USING (
  public.current_hasura_role() IN ('admin','system_admin')
  OR EXISTS (
    SELECT 1
    FROM public.workflow_definitions w
    WHERE w.id = workflow_approvals.workflow_id
      AND (
        (public.current_hasura_role() = 'district_admin' AND w.district_id = (SELECT district_id FROM public.current_user_profile()))
        OR (public.current_hasura_role() = 'school_admin' AND w.school_id = (SELECT school_id FROM public.current_user_profile()))
      )
  )
);

DROP POLICY IF EXISTS workflow_approvals_insert ON public.workflow_approvals;
CREATE POLICY workflow_approvals_insert ON public.workflow_approvals
FOR INSERT
WITH CHECK (public.current_hasura_role() IN ('admin','system_admin','district_admin'));
