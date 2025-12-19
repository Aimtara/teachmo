CREATE TABLE IF NOT EXISTS public.rate_limits (
  key text PRIMARY KEY,
  count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  window_seconds integer NOT NULL DEFAULT 60,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.message_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  reporter_user_id uuid NOT NULL,
  reason text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS message_reports_message_idx ON public.message_reports(message_id, created_at DESC);
CREATE INDEX IF NOT EXISTS message_reports_reporter_idx ON public.message_reports(reporter_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.message_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  blocker_user_id uuid NOT NULL,
  blocked_user_id uuid NOT NULL,
  reason text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, blocker_user_id, blocked_user_id)
);

CREATE INDEX IF NOT EXISTS message_blocks_blocker_idx ON public.message_blocks(blocker_user_id, school_id);
CREATE INDEX IF NOT EXISTS message_blocks_blocked_idx ON public.message_blocks(blocked_user_id, school_id);
