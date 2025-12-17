ALTER TABLE public.message_thread_invites
  DROP CONSTRAINT IF EXISTS message_thread_invites_revoked_by_fkey;

DROP INDEX IF EXISTS public.mti_thread_status_idx;

ALTER TABLE public.message_thread_invites
  DROP COLUMN IF EXISTS last_sent_at,
  DROP COLUMN IF EXISTS send_count,
  DROP COLUMN IF EXISTS revoked_at,
  DROP COLUMN IF EXISTS revoked_by;
