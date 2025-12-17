ALTER TABLE public.message_threads
  DROP COLUMN IF EXISTS school_id,
  DROP COLUMN IF EXISTS district_id;

DROP INDEX IF EXISTS public.message_threads_school_idx;
DROP INDEX IF EXISTS public.message_threads_district_idx;
