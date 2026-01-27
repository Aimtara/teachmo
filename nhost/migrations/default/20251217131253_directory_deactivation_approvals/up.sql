CREATE TABLE IF NOT EXISTS public.directory_deactivation_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  preview_id uuid NOT NULL,
  source_id uuid NULL,
  source_run_id uuid NULL,

  school_id uuid NOT NULL,
  district_id uuid NULL,

  status text NOT NULL DEFAULT 'pending',
  requested_by uuid NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),

  decided_by uuid NULL,
  decided_at timestamptz NULL,
  decision_reason text NULL,

  applied_at timestamptz NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),

  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  CONSTRAINT dda_preview_fkey FOREIGN KEY (preview_id) REFERENCES public.directory_import_previews(id) ON DELETE CASCADE,
  CONSTRAINT dda_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT dda_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS dda_school_status_idx
  ON public.directory_deactivation_approvals(school_id, status, requested_at DESC);

CREATE INDEX IF NOT EXISTS dda_preview_idx
  ON public.directory_deactivation_approvals(preview_id);
