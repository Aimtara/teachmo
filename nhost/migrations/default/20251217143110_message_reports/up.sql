DROP TABLE IF EXISTS public.message_reports;

CREATE TABLE IF NOT EXISTS public.message_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  school_id uuid NOT NULL,
  district_id uuid NULL,

  reporter_user_id uuid NOT NULL,
  thread_id uuid NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  message_id uuid NULL REFERENCES public.messages(id) ON DELETE SET NULL,

  reason text NOT NULL,
  detail text NULL,

  status text NOT NULL DEFAULT 'open',
  severity text NOT NULL DEFAULT 'medium',

  created_at timestamptz NOT NULL DEFAULT now(),
  triaged_at timestamptz NULL,
  triaged_by uuid NULL,
  resolved_at timestamptz NULL,
  resolved_by uuid NULL,

  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS mr_school_status_idx
  ON public.message_reports(school_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS mr_thread_idx
  ON public.message_reports(thread_id, created_at DESC);
