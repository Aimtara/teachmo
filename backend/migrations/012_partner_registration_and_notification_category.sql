-- Public partner onboarding applications + announcement category support

ALTER TABLE IF EXISTS public.notification_messages
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'general';

CREATE INDEX IF NOT EXISTS idx_notification_messages_category_created
  ON public.notification_messages(category, created_at desc);

CREATE TABLE IF NOT EXISTS public.partner_registration_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_name text NOT NULL,
  website text NULL,
  organization_type text NULL,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  description text NULL,
  offering_type text NULL,
  status text NOT NULL DEFAULT 'submitted',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_registration_applications_status
  ON public.partner_registration_applications(status, created_at desc);
