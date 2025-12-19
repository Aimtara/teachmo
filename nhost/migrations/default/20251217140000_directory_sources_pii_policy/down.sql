ALTER TABLE public.directory_sources
  DROP COLUMN IF EXISTS pii_policy,
  DROP COLUMN IF EXISTS retention_days,
  DROP COLUMN IF EXISTS dataguard_mode;
