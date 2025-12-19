CREATE TABLE IF NOT EXISTS public.school_data_scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL UNIQUE,
  district_id uuid NULL,
  scopes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sds_school_idx ON public.school_data_scopes(school_id);
