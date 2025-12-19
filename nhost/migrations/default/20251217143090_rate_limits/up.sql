CREATE TABLE IF NOT EXISTS public.rate_limits (
  key text PRIMARY KEY,
  count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  window_seconds integer NOT NULL DEFAULT 60,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- migrated to dedicated migrations 20251217143110_message_reports and 20251217143120_message_blocks
