CREATE TABLE IF NOT EXISTS public.directory_metrics_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  district_id uuid NULL,

  captured_at timestamptz NOT NULL DEFAULT now(),

  active_contacts integer NOT NULL DEFAULT 0,
  inactive_contacts integer NOT NULL DEFAULT 0,

  last_import_job_id uuid NULL,
  last_preview_id uuid NULL,
  last_approval_id uuid NULL,

  last_change_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS dms_school_time_idx
  ON public.directory_metrics_snapshots(school_id, captured_at DESC);
