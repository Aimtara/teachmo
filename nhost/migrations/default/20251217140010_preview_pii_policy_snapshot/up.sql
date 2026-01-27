ALTER TABLE public.directory_import_previews
  ADD COLUMN IF NOT EXISTS pii_policy_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;
