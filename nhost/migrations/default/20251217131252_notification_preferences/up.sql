CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id uuid PRIMARY KEY,
  email_enabled boolean NOT NULL DEFAULT true,
  in_app_enabled boolean NOT NULL DEFAULT true,

  directory_alerts boolean NOT NULL DEFAULT true,
  digest_mode text NOT NULL DEFAULT 'immediate',

  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT notif_prefs_user_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
