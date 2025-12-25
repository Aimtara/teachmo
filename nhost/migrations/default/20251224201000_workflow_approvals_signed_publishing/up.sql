-- Future-grade enterprise power: workflow approvals + signed publishing

-- 1) Workflow lifecycle states
-- Existing installs may use status='active' from earlier phases.
ALTER TABLE IF EXISTS public.workflow_definitions
  ALTER COLUMN status SET DEFAULT 'draft';

UPDATE public.workflow_definitions
SET status = 'published'
WHERE status = 'active';

-- 2) Add review/publish metadata columns
ALTER TABLE IF EXISTS public.workflow_definitions
  ADD COLUMN IF NOT EXISTS review_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_requested_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS published_version integer,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_by uuid;

COMMENT ON COLUMN public.workflow_definitions.status IS
  'Workflow lifecycle: draft | in_review | approved | published | archived';
COMMENT ON COLUMN public.workflow_definitions.published_version IS
  'If set, published workflows execute this snapshot version (unless pinned_version overrides).';

-- 3) Audit trail for workflow governance
CREATE TABLE IF NOT EXISTS public.workflow_publication_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.workflow_definitions(id) ON DELETE CASCADE,
  action text NOT NULL,
  from_version integer,
  to_version integer,
  actor_user_id uuid,
  signature text,
  signature_alg text NOT NULL DEFAULT 'HMAC-SHA256',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workflow_publication_audits_workflow_idx
  ON public.workflow_publication_audits(workflow_id, created_at DESC);

ALTER TABLE public.workflow_publication_audits ENABLE ROW LEVEL SECURITY;

-- Tenant-scoped select
DROP POLICY IF EXISTS workflow_publication_audits_select ON public.workflow_publication_audits;
CREATE POLICY workflow_publication_audits_select ON public.workflow_publication_audits
FOR SELECT
USING (
  public.current_hasura_role() IN ('admin','system_admin')
  OR EXISTS (
    SELECT 1
    FROM public.workflow_definitions w
    WHERE w.id = workflow_publication_audits.workflow_id
      AND (
        (public.current_hasura_role() = 'district_admin' AND w.district_id = (SELECT district_id FROM public.current_user_profile()))
        OR (public.current_hasura_role() = 'school_admin' AND w.school_id = (SELECT school_id FROM public.current_user_profile()))
      )
  )
);

-- Inserts are typically performed via server-side functions (admin secret), but keep a guard anyway.
DROP POLICY IF EXISTS workflow_publication_audits_insert ON public.workflow_publication_audits;
CREATE POLICY workflow_publication_audits_insert ON public.workflow_publication_audits
FOR INSERT
WITH CHECK (
  public.current_hasura_role() IN ('admin','system_admin','district_admin')
);

-- 4) Fix: workflow_run_steps missing created_at (Admin UI orders by created_at)
ALTER TABLE IF EXISTS public.workflow_run_steps
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS workflow_run_steps_created_idx
  ON public.workflow_run_steps(run_id, created_at ASC);
