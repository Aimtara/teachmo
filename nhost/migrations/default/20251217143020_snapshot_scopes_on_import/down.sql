ALTER TABLE public.directory_import_previews
  DROP COLUMN IF EXISTS scopes_snapshot;

ALTER TABLE public.directory_import_jobs
  DROP COLUMN IF EXISTS scopes_snapshot;
