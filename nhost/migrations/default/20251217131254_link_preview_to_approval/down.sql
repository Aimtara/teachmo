ALTER TABLE public.directory_import_previews
  DROP CONSTRAINT IF EXISTS dip_approval_fkey;

DROP INDEX IF EXISTS public.dip_requires_approval_idx;

ALTER TABLE public.directory_import_previews
  DROP COLUMN IF EXISTS requires_approval,
  DROP COLUMN IF EXISTS approval_id,
  DROP COLUMN IF EXISTS applied_at;
