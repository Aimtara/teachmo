ALTER TABLE public.message_threads
  DROP COLUMN IF EXISTS moderation_status,
  DROP COLUMN IF EXISTS last_reported_at,
  DROP COLUMN IF EXISTS closed_reason;
