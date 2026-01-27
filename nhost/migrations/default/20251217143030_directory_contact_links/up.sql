CREATE TABLE IF NOT EXISTS public.directory_contact_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  school_id uuid NOT NULL,
  district_id uuid NULL,

  email citext NOT NULL,
  user_id uuid NOT NULL,

  link_status text NOT NULL DEFAULT 'linked', -- linked|unlinked
  linked_at timestamptz NOT NULL DEFAULT now(),
  unlinked_at timestamptz NULL,
  linked_by uuid NULL, -- admin who approved/linked, optional

  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  UNIQUE (school_id, email),
  UNIQUE (school_id, user_id),

  CONSTRAINT dcl_user_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS dcl_school_idx ON public.directory_contact_links(school_id, link_status);
