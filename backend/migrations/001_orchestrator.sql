-- Orchestrator persistence (WeeklyBrief + DailyPlan + DigestItem)
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS schema_migrations (
  id serial PRIMARY KEY,
  filename text NOT NULL UNIQUE,
  applied_at timestamptz NOT NULL DEFAULT now()
);

-- Weekly briefs
CREATE TABLE IF NOT EXISTS orchestrator_weekly_briefs (
  id text PRIMARY KEY,
  family_id text NOT NULL,
  created_at timestamptz NOT NULL,
  week_start timestamptz NOT NULL,
  week_end timestamptz NOT NULL,
  current_zone text NOT NULL,
  tension numeric NOT NULL,
  slack numeric NOT NULL,
  cooldown_active boolean NOT NULL,
  brief_json jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_owb_family_created
  ON orchestrator_weekly_briefs (family_id, created_at DESC);

-- Daily plans
CREATE TABLE IF NOT EXISTS orchestrator_daily_plans (
  id text PRIMARY KEY,
  family_id text NOT NULL,
  created_at timestamptz NOT NULL,
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  zone_at_plan_time text NOT NULL,
  attention_budget_min int NOT NULL,
  plan_json jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_odp_family_created
  ON orchestrator_daily_plans (family_id, created_at DESC);

-- Digest items
CREATE TABLE IF NOT EXISTS orchestrator_digest_items (
  id text PRIMARY KEY,
  family_id text NOT NULL,
  created_at timestamptz NOT NULL,
  signal_type text NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  urgency numeric NOT NULL,
  impact numeric NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  meta jsonb,
  delivered_at timestamptz,
  dismissed_at timestamptz,
  CONSTRAINT digest_status_check CHECK (status IN ('queued','delivered','dismissed'))
);

CREATE INDEX IF NOT EXISTS idx_odi_family_created
  ON orchestrator_digest_items (family_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_odi_family_status_created
  ON orchestrator_digest_items (family_id, status, created_at DESC);
