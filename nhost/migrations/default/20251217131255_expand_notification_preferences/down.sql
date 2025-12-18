ALTER TABLE public.notification_preferences
  DROP COLUMN IF EXISTS quiet_hours_start,
  DROP COLUMN IF EXISTS quiet_hours_end,
  DROP COLUMN IF EXISTS timezone,
  DROP COLUMN IF EXISTS digest_hour,
  DROP COLUMN IF EXISTS invites_alerts,
  DROP COLUMN IF EXISTS messaging_alerts,
  DROP COLUMN IF EXISTS directory_digest,
  DROP COLUMN IF EXISTS invites_digest,
  DROP COLUMN IF EXISTS messaging_digest;
