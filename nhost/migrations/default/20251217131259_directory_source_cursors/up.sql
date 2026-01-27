CREATE TABLE IF NOT EXISTS public.directory_source_cursors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL UNIQUE REFERENCES public.directory_sources(id) ON DELETE CASCADE,

  -- generic
  last_full_sync_at timestamptz NULL,
  last_delta_sync_at timestamptz NULL,
  last_success_run_id uuid NULL,

  -- OneRoster/ClassLink delta
  oneroster_last_delta_datetime timestamptz NULL,

  -- Clever events
  clever_last_event_id text NULL,
  clever_last_event_created timestamptz NULL,

  -- hygiene
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dsc_full_idx ON public.directory_source_cursors(last_full_sync_at);
