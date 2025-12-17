CREATE TABLE IF NOT EXISTS public.invite_send_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  window_start timestamptz NOT NULL,
  window_seconds integer NOT NULL,
  count integer NOT NULL DEFAULT 0,
  UNIQUE (actor_id, window_start, window_seconds)
);

CREATE INDEX IF NOT EXISTS invite_send_counters_actor_idx ON public.invite_send_counters(actor_id);
