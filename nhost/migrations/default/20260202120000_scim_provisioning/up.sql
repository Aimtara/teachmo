CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.scim_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  school_id uuid NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  external_id text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scim_identities_external_unique UNIQUE (organization_id, school_id, external_id),
  CONSTRAINT scim_identities_user_unique UNIQUE (organization_id, school_id, user_id)
);

CREATE INDEX IF NOT EXISTS scim_identities_user_idx ON public.scim_identities(user_id);

CREATE TABLE IF NOT EXISTS public.scim_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  school_id uuid NULL,
  external_id text NULL,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scim_groups_unique UNIQUE (organization_id, school_id, display_name)
);

CREATE TABLE IF NOT EXISTS public.scim_group_members (
  group_id uuid NOT NULL REFERENCES public.scim_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scim_group_members_unique UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS scim_group_members_user_idx ON public.scim_group_members(user_id);

CREATE TABLE IF NOT EXISTS public.impersonation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  school_id uuid NULL,
  reason text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 hour'),
  revoked_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS impersonation_sessions_admin_idx ON public.impersonation_sessions(admin_user_id);
CREATE INDEX IF NOT EXISTS impersonation_sessions_target_idx ON public.impersonation_sessions(target_user_id);
