ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS sender_user_id uuid,
  ADD COLUMN IF NOT EXISTS flagged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS flag_reason text;

-- Backfill sender_user_id from sender_id when available
UPDATE public.messages
SET sender_user_id = sender_id
WHERE sender_user_id IS NULL AND sender_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS msg_thread_time_idx ON public.messages(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS msg_sender_time_idx ON public.messages(sender_user_id, created_at DESC);
