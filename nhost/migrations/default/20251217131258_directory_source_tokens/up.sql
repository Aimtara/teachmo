CREATE TABLE IF NOT EXISTS public.directory_source_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL UNIQUE REFERENCES public.directory_sources(id) ON DELETE CASCADE,

  token_type text NOT NULL DEFAULT 'bearer',
  access_token text NOT NULL,
  expires_at timestamptz NULL,
  scope text NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dst_expires_idx ON public.directory_source_tokens(expires_at);
