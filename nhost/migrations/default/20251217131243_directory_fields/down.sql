ALTER TABLE public.school_contact_directory
  DROP CONSTRAINT IF EXISTS scd_created_by_fkey;

DROP INDEX IF EXISTS public.scd_active_school_idx;

ALTER TABLE public.school_contact_directory
  DROP COLUMN IF EXISTS is_active,
  DROP COLUMN IF EXISTS created_by,
  DROP COLUMN IF EXISTS updated_at,
  DROP COLUMN IF EXISTS deactivated_at;
