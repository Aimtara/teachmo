DROP TABLE IF EXISTS public.message_blocks;

CREATE TABLE IF NOT EXISTS public.message_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  school_id uuid NOT NULL,
  district_id uuid NULL,

  blocked_user_id uuid NOT NULL,
  blocked_by uuid NOT NULL,

  reason text NULL,
  status text NOT NULL DEFAULT 'active',

  created_at timestamptz NOT NULL DEFAULT now(),
  lifted_at timestamptz NULL,
  lifted_by uuid NULL,

  UNIQUE (school_id, blocked_user_id)
);

CREATE INDEX IF NOT EXISTS mb_school_idx
  ON public.message_blocks(school_id, status, created_at DESC);
