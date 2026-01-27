CREATE TABLE IF NOT EXISTS public.invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  school_id uuid NOT NULL,
  district_id uuid NULL,

  email citext NOT NULL,
  role text NOT NULL DEFAULT 'parent', -- parent|teacher|staff
  status text NOT NULL DEFAULT 'pending', -- pending|sent|accepted|expired|revoked

  token_hash text NOT NULL, -- store hash only
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  sent_at timestamptz NULL,
  accepted_at timestamptz NULL,

  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- dedupe: only one active pending invite per school+email+role
  UNIQUE (school_id, email, role, status)
);

CREATE INDEX IF NOT EXISTS invites_school_idx ON public.invites(school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS invites_email_idx ON public.invites(email);
CREATE INDEX IF NOT EXISTS invites_expires_idx ON public.invites(expires_at);
