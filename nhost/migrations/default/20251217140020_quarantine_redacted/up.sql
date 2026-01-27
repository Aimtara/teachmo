ALTER TABLE public.directory_import_quarantine
  ADD COLUMN IF NOT EXISTS raw_redacted jsonb NOT NULL DEFAULT '{}'::jsonb;
