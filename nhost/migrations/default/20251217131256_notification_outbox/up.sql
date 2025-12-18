CREATE TABLE IF NOT EXISTS public.notification_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  channel text NOT NULL,     -- email
  kind text NOT NULL,        -- daily_digest
  window_start date NOT NULL,
  window_end date NOT NULL,
  status text NOT NULL DEFAULT 'queued', -- queued|sent|failed
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz NULL,
  error text NULL,

  UNIQUE (user_id, channel, kind, window_start, window_end),
  CONSTRAINT outbox_user_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS outbox_status_idx ON public.notification_outbox(status, created_at);
