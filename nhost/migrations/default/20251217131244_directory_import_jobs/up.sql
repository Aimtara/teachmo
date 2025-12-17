CREATE TABLE IF NOT EXISTS public.directory_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  school_id uuid NOT NULL,
  district_id uuid NULL,

  source_type text NOT NULL DEFAULT 'csv',
  source_ref text NULL,
  source_hash text NOT NULL,

  status text NOT NULL DEFAULT 'running',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz NULL,

  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS dir_jobs_school_idx ON public.directory_import_jobs(school_id, started_at DESC);
CREATE INDEX IF NOT EXISTS dir_jobs_hash_idx ON public.directory_import_jobs(source_hash);
