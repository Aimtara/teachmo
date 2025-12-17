CREATE TABLE IF NOT EXISTS public.directory_import_previews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  school_id uuid NOT NULL,
  district_id uuid NULL,

  source_id uuid NULL,
  source_ref text NULL,
  source_hash text NOT NULL,

  schema_version text NOT NULL DEFAULT 'v1',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  applied_at timestamptz NULL,

  deactivate_missing boolean NOT NULL DEFAULT false,

  diff jsonb NOT NULL DEFAULT '{}'::jsonb,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS dip_school_idx ON public.directory_import_previews(school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS dip_hash_idx ON public.directory_import_previews(source_hash);
