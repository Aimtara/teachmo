ALTER TABLE public.directory_import_previews
  ADD COLUMN IF NOT EXISTS requires_approval boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_id uuid NULL,
  ADD COLUMN IF NOT EXISTS applied_at timestamptz NULL;

ALTER TABLE public.directory_import_previews
  ADD CONSTRAINT IF NOT EXISTS dip_approval_fkey
  FOREIGN KEY (approval_id) REFERENCES public.directory_deactivation_approvals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS dip_requires_approval_idx
  ON public.directory_import_previews(school_id, requires_approval, created_at DESC);
