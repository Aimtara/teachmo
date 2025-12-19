ALTER TABLE public.directory_import_previews
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'snapshot'; -- snapshot|delta
