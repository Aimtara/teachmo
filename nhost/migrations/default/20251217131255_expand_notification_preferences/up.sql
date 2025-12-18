ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS quiet_hours_start integer NULL,  -- 0-23
  ADD COLUMN IF NOT EXISTS quiet_hours_end integer NULL,    -- 0-23
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/New_York',

  ADD COLUMN IF NOT EXISTS digest_hour integer NOT NULL DEFAULT 7, -- send at 7am local time

  ADD COLUMN IF NOT EXISTS invites_alerts boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS messaging_alerts boolean NOT NULL DEFAULT true,

  ADD COLUMN IF NOT EXISTS directory_digest boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS invites_digest boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS messaging_digest boolean NOT NULL DEFAULT false;
