CREATE TABLE IF NOT EXISTS public.message_thread_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  role text NULL,
  CONSTRAINT message_thread_participants_thread_fkey
    FOREIGN KEY (thread_id) REFERENCES public.message_threads(id) ON DELETE CASCADE,
  CONSTRAINT message_thread_participants_user_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT message_thread_participants_unique UNIQUE (thread_id, user_id)
);

CREATE INDEX IF NOT EXISTS mtp_thread_id_idx ON public.message_thread_participants(thread_id);
CREATE INDEX IF NOT EXISTS mtp_user_id_idx ON public.message_thread_participants(user_id);
