DROP INDEX IF EXISTS audit_log_school_id_idx;
DROP INDEX IF EXISTS audit_log_district_id_idx;

ALTER TABLE public.audit_log
  DROP COLUMN IF EXISTS school_id,
  DROP COLUMN IF EXISTS district_id;
