ALTER TABLE public.directory_import_quarantine
  ADD COLUMN raw_redacted jsonb NOT NULL DEFAULT '{}'::jsonb;
