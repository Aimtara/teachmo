CREATE TABLE IF NOT EXISTS public.message_thread_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL,
  invited_by uuid NOT NULL,

  -- store email to verify user matches on accept
  email citext NOT NULL,

  -- single-use token, store only a hash
  token_hash text NOT NULL UNIQUE,

  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz NULL,
  accepted_by uuid NULL,

  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  CONSTRAINT message_thread_invites_thread_fkey
    FOREIGN KEY (thread_id) REFERENCES public.message_threads(id) ON DELETE CASCADE,
  CONSTRAINT message_thread_invites_invited_by_fkey
    FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT message_thread_invites_accepted_by_fkey
    FOREIGN KEY (accepted_by) REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS mti_thread_id_idx ON public.message_thread_invites(thread_id);
CREATE INDEX IF NOT EXISTS mti_email_idx ON public.message_thread_invites(email);
CREATE INDEX IF NOT EXISTS mti_expires_at_idx ON public.message_thread_invites(expires_at);
