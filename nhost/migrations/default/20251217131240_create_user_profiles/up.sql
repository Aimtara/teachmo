CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id uuid PRIMARY KEY,
  role text NOT NULL,
  district_id uuid NULL,
  school_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_profiles_user_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS user_profiles_school_idx ON public.user_profiles(school_id);
CREATE INDEX IF NOT EXISTS user_profiles_district_idx ON public.user_profiles(district_id);
