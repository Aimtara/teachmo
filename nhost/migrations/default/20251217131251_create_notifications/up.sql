CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,

  type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body text NOT NULL,

  entity_type text NULL,
  entity_id uuid NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz NULL,

  dedupe_key text NULL,
  dedupe_until timestamptz NULL,

  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  CONSTRAINT notifications_user_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON public.notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_dedupe_idx
  ON public.notifications(dedupe_key);
