CREATE TABLE IF NOT EXISTS public.directory_source_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL,
  job_id uuid NULL,

  status text NOT NULL DEFAULT 'running',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz NULL,

  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,

  CONSTRAINT directory_source_runs_source_fkey
    FOREIGN KEY (source_id) REFERENCES public.directory_sources(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS dir_source_runs_source_idx ON public.directory_source_runs(source_id, started_at DESC);
