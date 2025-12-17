CREATE TABLE IF NOT EXISTS public.directory_schema_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL UNIQUE,
  required_headers text[] NOT NULL,
  optional_headers text[] NOT NULL DEFAULT '{}'::text[],
  rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.directory_schema_versions (version, required_headers, optional_headers, rules)
VALUES ('v1', ARRAY['email','contact_type'], ARRAY[]::text[], '{"contact_type":["parent_guardian","emergency_contact","other"]}'::jsonb)
ON CONFLICT (version) DO NOTHING;
