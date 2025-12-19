CREATE TABLE IF NOT EXISTS public.messaging_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  school_id uuid NOT NULL,
  district_id uuid NULL,

  requester_user_id uuid NOT NULL,
  target_user_id uuid NOT NULL,

  status text NOT NULL DEFAULT 'pending', -- pending|approved|denied|blocked|expired
  reason text NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz NULL,
  decided_by uuid NULL,

  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),

  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  UNIQUE (school_id, requester_user_id, target_user_id, status)
);

CREATE INDEX IF NOT EXISTS mr_school_status_idx
  ON public.messaging_requests(school_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS mr_target_idx
  ON public.messaging_requests(target_user_id, status);
