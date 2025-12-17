CREATE TABLE IF NOT EXISTS public.school_contact_directory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  district_id uuid NULL,
  email citext NOT NULL,
  contact_type text NOT NULL DEFAULT 'parent_guardian',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, email)
);

CREATE INDEX IF NOT EXISTS scd_school_idx ON public.school_contact_directory(school_id);
CREATE INDEX IF NOT EXISTS scd_email_idx ON public.school_contact_directory(email);
