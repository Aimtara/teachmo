CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.partner_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  partner_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  description text NULL,
  status text NOT NULL DEFAULT 'pending',
  reason text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partner_submission_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  submission_id uuid NOT NULL REFERENCES public.partner_submissions(id) ON DELETE CASCADE,
  actor_id uuid NULL,
  action text NOT NULL,
  reason text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partner_incentives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  partner_id uuid NULL,
  title text NOT NULL,
  description text NULL,
  value numeric NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partner_incentive_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  incentive_id uuid NOT NULL REFERENCES public.partner_incentives(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payout text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (incentive_id, partner_id)
);

CREATE TABLE IF NOT EXISTS public.partner_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  title text NOT NULL,
  description text NULL,
  category text NULL,
  difficulty text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partner_course_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.partner_courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NULL,
  module_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.partner_course_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.partner_courses(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL,
  completed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, partner_id)
);

CREATE TABLE IF NOT EXISTS public.partner_course_module_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.partner_course_enrollments(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.partner_course_modules(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id, module_id)
);

CREATE TABLE IF NOT EXISTS public.partner_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  partner_id uuid NOT NULL,
  title text NOT NULL,
  description text NULL,
  status text NOT NULL DEFAULT 'pending',
  signed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partner_onboarding_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  title text NOT NULL,
  description text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partner_onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  partner_id uuid NOT NULL,
  task_id uuid NOT NULL REFERENCES public.partner_onboarding_tasks(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  completed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (partner_id, task_id)
);

CREATE INDEX IF NOT EXISTS partner_submissions_org_idx ON public.partner_submissions(organization_id);
CREATE INDEX IF NOT EXISTS partner_submissions_partner_idx ON public.partner_submissions(partner_id);
CREATE INDEX IF NOT EXISTS partner_incentives_org_idx ON public.partner_incentives(organization_id);
CREATE INDEX IF NOT EXISTS partner_incentive_applications_org_idx ON public.partner_incentive_applications(organization_id);
CREATE INDEX IF NOT EXISTS partner_courses_org_idx ON public.partner_courses(organization_id);
CREATE INDEX IF NOT EXISTS partner_course_enrollments_org_idx ON public.partner_course_enrollments(organization_id);
CREATE INDEX IF NOT EXISTS partner_contracts_org_idx ON public.partner_contracts(organization_id);
CREATE INDEX IF NOT EXISTS partner_onboarding_tasks_org_idx ON public.partner_onboarding_tasks(organization_id);
CREATE INDEX IF NOT EXISTS partner_onboarding_progress_org_idx ON public.partner_onboarding_progress(organization_id);

CREATE OR REPLACE FUNCTION public.set_partner_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_partner_submissions ON public.partner_submissions;
CREATE TRIGGER set_updated_at_partner_submissions
BEFORE UPDATE ON public.partner_submissions
FOR EACH ROW EXECUTE FUNCTION public.set_partner_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_partner_incentives ON public.partner_incentives;
CREATE TRIGGER set_updated_at_partner_incentives
BEFORE UPDATE ON public.partner_incentives
FOR EACH ROW EXECUTE FUNCTION public.set_partner_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_partner_incentive_applications ON public.partner_incentive_applications;
CREATE TRIGGER set_updated_at_partner_incentive_applications
BEFORE UPDATE ON public.partner_incentive_applications
FOR EACH ROW EXECUTE FUNCTION public.set_partner_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_partner_courses ON public.partner_courses;
CREATE TRIGGER set_updated_at_partner_courses
BEFORE UPDATE ON public.partner_courses
FOR EACH ROW EXECUTE FUNCTION public.set_partner_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_partner_course_enrollments ON public.partner_course_enrollments;
CREATE TRIGGER set_updated_at_partner_course_enrollments
BEFORE UPDATE ON public.partner_course_enrollments
FOR EACH ROW EXECUTE FUNCTION public.set_partner_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_partner_contracts ON public.partner_contracts;
CREATE TRIGGER set_updated_at_partner_contracts
BEFORE UPDATE ON public.partner_contracts
FOR EACH ROW EXECUTE FUNCTION public.set_partner_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_partner_onboarding_tasks ON public.partner_onboarding_tasks;
CREATE TRIGGER set_updated_at_partner_onboarding_tasks
BEFORE UPDATE ON public.partner_onboarding_tasks
FOR EACH ROW EXECUTE FUNCTION public.set_partner_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_partner_onboarding_progress ON public.partner_onboarding_progress;
CREATE TRIGGER set_updated_at_partner_onboarding_progress
BEFORE UPDATE ON public.partner_onboarding_progress
FOR EACH ROW EXECUTE FUNCTION public.set_partner_updated_at();
