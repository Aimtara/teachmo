CREATE TABLE IF NOT EXISTS public.directory_import_quarantine (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preview_id uuid NOT NULL,
  row_number integer NOT NULL,
  raw jsonb NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quarantine_preview_fkey FOREIGN KEY (preview_id) REFERENCES public.directory_import_previews(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS quarantine_preview_idx ON public.directory_import_quarantine(preview_id);
