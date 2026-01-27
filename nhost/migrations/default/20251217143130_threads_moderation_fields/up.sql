ALTER TABLE public.message_threads
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'ok',
  ADD COLUMN IF NOT EXISTS last_reported_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS closed_reason text NULL;
