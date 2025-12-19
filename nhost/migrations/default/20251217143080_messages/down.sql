DROP INDEX IF EXISTS public.msg_thread_time_idx;
DROP INDEX IF EXISTS public.msg_sender_time_idx;

ALTER TABLE public.messages DROP COLUMN IF EXISTS sender_user_id;
ALTER TABLE public.messages DROP COLUMN IF EXISTS flagged;
ALTER TABLE public.messages DROP COLUMN IF EXISTS flag_reason;
