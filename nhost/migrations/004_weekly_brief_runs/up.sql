-- Weekly brief generation run log
-- Tracks manual/cron executions for observability and pilot operations.

CREATE TABLE IF NOT EXISTS weekly_brief_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  school_id uuid,

  week_start_date date NOT NULL,
  week_end_date date NOT NULL,

  trigger text NOT NULL DEFAULT 'manual',
  dry_run boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'STARTED',

  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,

  generated_count int NOT NULL DEFAULT 0,
  error text,

  created_by_user_id uuid,
  created_by_role text,

  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_weekly_brief_runs_started_at ON weekly_brief_runs (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_brief_runs_week_start ON weekly_brief_runs (week_start_date DESC);
