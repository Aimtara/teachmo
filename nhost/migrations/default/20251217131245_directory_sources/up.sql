CREATE TABLE IF NOT EXISTS public.directory_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  school_id uuid NOT NULL,
  district_id uuid NULL,

  name text NOT NULL,
  source_type text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,

  config jsonb NOT NULL DEFAULT '{}'::jsonb,

  schedule_cron text NULL,
  schedule_tz text NOT NULL DEFAULT 'America/New_York',

  last_run_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS directory_sources_school_idx ON public.directory_sources(school_id, is_enabled);
