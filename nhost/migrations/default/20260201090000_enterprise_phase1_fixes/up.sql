CREATE TABLE IF NOT EXISTS public.tenant_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  domain text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  verified_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, domain)
);

DROP TRIGGER IF EXISTS tenant_domains_updated_at ON public.tenant_domains;
CREATE TRIGGER tenant_domains_updated_at
BEFORE UPDATE ON public.tenant_domains
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND constraint_name = 'profiles_user_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
  email_domain text;
  matched_org uuid;
  user_full_name text;
BEGIN
  user_email := lower(new.email);
  IF user_email IS NOT NULL AND position('@' in user_email) > 0 THEN
    email_domain := split_part(user_email, '@', 2);
    SELECT organization_id
      INTO matched_org
      FROM public.tenant_domains
      WHERE lower(domain) = email_domain
      ORDER BY is_primary DESC, verified_at DESC NULLS LAST
      LIMIT 1;
  END IF;

  user_full_name := COALESCE(
    NULLIF(trim(new.display_name), ''),
    NULLIF(trim(new.raw_user_meta_data->>'full_name'), ''),
    NULLIF(trim(new.raw_user_meta_data->>'name'), ''),
    split_part(user_email, '@', 1)
  );

  INSERT INTO public.profiles (user_id, full_name, app_role, organization_id)
  VALUES (new.id, COALESCE(user_full_name, 'New User'), 'parent', matched_org)
  ON CONFLICT (user_id)
  DO UPDATE SET organization_id = COALESCE(public.profiles.organization_id, EXCLUDED.organization_id);

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
