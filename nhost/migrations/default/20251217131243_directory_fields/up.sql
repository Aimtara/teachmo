ALTER TABLE public.school_contact_directory
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_by uuid NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS scd_active_school_idx
  ON public.school_contact_directory(school_id, is_active);

-- Optional FK
ALTER TABLE public.school_contact_directory
  ADD CONSTRAINT IF NOT EXISTS scd_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
