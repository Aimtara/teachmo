ALTER TABLE public.directory_import_previews
  ADD COLUMN IF NOT EXISTS scopes_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.directory_import_jobs
  ADD COLUMN IF NOT EXISTS scopes_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;
