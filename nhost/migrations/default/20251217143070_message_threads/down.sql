ALTER TABLE public.message_threads DROP CONSTRAINT IF EXISTS message_threads_request_fk;
ALTER TABLE public.message_threads DROP CONSTRAINT IF EXISTS message_threads_school_requester_target_key;

ALTER TABLE public.message_threads DROP COLUMN IF EXISTS requester_user_id;
ALTER TABLE public.message_threads DROP COLUMN IF EXISTS target_user_id;
ALTER TABLE public.message_threads DROP COLUMN IF EXISTS request_id;
ALTER TABLE public.message_threads DROP COLUMN IF EXISTS status;
ALTER TABLE public.message_threads DROP COLUMN IF EXISTS closed_at;

DROP INDEX IF EXISTS public.mt_school_idx;
DROP INDEX IF EXISTS public.mt_target_idx;
