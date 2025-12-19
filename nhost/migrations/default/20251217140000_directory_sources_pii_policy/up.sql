ALTER TABLE public.directory_sources
  ADD COLUMN IF NOT EXISTS pii_policy jsonb NOT NULL DEFAULT '{
    "storeEmail": true,
    "storeNames": false,
    "storeExternalIds": true,
    "storePhone": false,
    "storeAddress": false,
    "storeRawQuarantine": false,
    "emailAllowlistDomains": [],
    "emailDenylistDomains": []
  }'::jsonb,
  ADD COLUMN IF NOT EXISTS retention_days integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS dataguard_mode text NOT NULL DEFAULT 'auto';
