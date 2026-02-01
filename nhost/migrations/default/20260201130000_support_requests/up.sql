-- Create support_requests table for live support widget
CREATE TABLE IF NOT EXISTS public.support_requests (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  district_id uuid REFERENCES public.districts(id) ON DELETE SET NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'normal',
  source text NOT NULL DEFAULT 'widget',
  metadata jsonb DEFAULT '{}'::jsonb,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS support_requests_user_id_idx ON public.support_requests(user_id);
CREATE INDEX IF NOT EXISTS support_requests_school_id_idx ON public.support_requests(school_id);
CREATE INDEX IF NOT EXISTS support_requests_district_id_idx ON public.support_requests(district_id);
CREATE INDEX IF NOT EXISTS support_requests_status_idx ON public.support_requests(status);
CREATE INDEX IF NOT EXISTS support_requests_created_at_idx ON public.support_requests(created_at DESC);

-- Add RLS policies
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own support requests
CREATE POLICY support_requests_select_own ON public.support_requests
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));

-- Users can insert their own support requests
CREATE POLICY support_requests_insert_own ON public.support_requests
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Admins can view all support requests
CREATE POLICY support_requests_select_admin ON public.support_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
        AND user_profiles.role IN ('admin', 'system_admin', 'district_admin', 'school_admin')
    )
  );

-- Admins can update support requests
CREATE POLICY support_requests_update_admin ON public.support_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = (SELECT auth.uid())
        AND user_profiles.role IN ('admin', 'system_admin', 'district_admin', 'school_admin')
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER support_requests_updated_at
  BEFORE UPDATE ON public.support_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Track table in Hasura
COMMENT ON TABLE public.support_requests IS 'Support requests submitted via live support widget';
