CREATE TABLE IF NOT EXISTS public.directory_import_preview_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preview_id uuid NOT NULL,
  email citext NOT NULL,
  contact_type text NOT NULL,
  UNIQUE (preview_id, email),
  CONSTRAINT preview_rows_preview_fkey FOREIGN KEY (preview_id) REFERENCES public.directory_import_previews(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS preview_rows_preview_idx ON public.directory_import_preview_rows(preview_id);
