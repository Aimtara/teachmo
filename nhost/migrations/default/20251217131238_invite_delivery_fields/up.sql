ALTER TABLE public.message_thread_invites
  ADD COLUMN IF NOT EXISTS last_sent_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS send_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS revoked_by uuid NULL;

ALTER TABLE public.message_thread_invites
  ADD CONSTRAINT IF NOT EXISTS message_thread_invites_revoked_by_fkey
  FOREIGN KEY (revoked_by) REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS mti_thread_status_idx
  ON public.message_thread_invites(thread_id, accepted_at, revoked_at, expires_at);
