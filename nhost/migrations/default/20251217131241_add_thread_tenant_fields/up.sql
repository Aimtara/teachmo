ALTER TABLE public.message_threads
  ADD COLUMN IF NOT EXISTS school_id uuid NULL,
  ADD COLUMN IF NOT EXISTS district_id uuid NULL;

CREATE INDEX IF NOT EXISTS message_threads_school_idx ON public.message_threads(school_id);
CREATE INDEX IF NOT EXISTS message_threads_district_idx ON public.message_threads(district_id);
