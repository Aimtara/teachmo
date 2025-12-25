-- Add tenant-scoping columns to audit_log for enterprise-grade isolation
ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS district_id uuid NULL,
  ADD COLUMN IF NOT EXISTS school_id uuid NULL;

-- Backfill from actor's profile where possible
UPDATE public.audit_log al
SET
  district_id = COALESCE(al.district_id, up.district_id),
  school_id   = COALESCE(al.school_id, up.school_id)
FROM public.user_profiles up
WHERE up.user_id = al.actor_id
  AND (al.district_id IS NULL OR al.school_id IS NULL);

CREATE INDEX IF NOT EXISTS audit_log_district_id_idx ON public.audit_log(district_id);
CREATE INDEX IF NOT EXISTS audit_log_school_id_idx ON public.audit_log(school_id);
