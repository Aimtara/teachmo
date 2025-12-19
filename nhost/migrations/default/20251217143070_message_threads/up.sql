CREATE TABLE IF NOT EXISTS public.message_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  school_id uuid NOT NULL,
  district_id uuid NULL,

  requester_user_id uuid NOT NULL,
  target_user_id uuid NOT NULL,

  request_id uuid NULL REFERENCES public.messaging_requests(id) ON DELETE SET NULL,

  status text NOT NULL DEFAULT 'active', -- active|closed|blocked
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz NULL,

  UNIQUE (school_id, requester_user_id, target_user_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'message_threads' AND column_name = 'requester_user_id'
  ) THEN
    ALTER TABLE public.message_threads ADD COLUMN requester_user_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'message_threads' AND column_name = 'target_user_id'
  ) THEN
    ALTER TABLE public.message_threads ADD COLUMN target_user_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'message_threads' AND column_name = 'request_id'
  ) THEN
    ALTER TABLE public.message_threads ADD COLUMN request_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'message_threads' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.message_threads ADD COLUMN status text NOT NULL DEFAULT 'active';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'message_threads' AND column_name = 'closed_at'
  ) THEN
    ALTER TABLE public.message_threads ADD COLUMN closed_at timestamptz NULL;
  END IF;

  -- Ensure defaults for status
  ALTER TABLE public.message_threads ALTER COLUMN status SET DEFAULT 'active';
END $$;

ALTER TABLE public.message_threads
  ADD CONSTRAINT IF NOT EXISTS message_threads_request_fk
    FOREIGN KEY (request_id) REFERENCES public.messaging_requests(id) ON DELETE SET NULL,
  ADD CONSTRAINT IF NOT EXISTS message_threads_school_requester_target_key
    UNIQUE (school_id, requester_user_id, target_user_id);

CREATE INDEX IF NOT EXISTS mt_school_idx ON public.message_threads(school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS mt_target_idx ON public.message_threads(target_user_id, status);
