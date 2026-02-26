-- Weekly Family Brief
-- Immutable snapshot per parent/child/week.

CREATE TABLE IF NOT EXISTS weekly_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Parent user id (Nhost auth user id)
  parent_user_id uuid NOT NULL,

  -- Child id (uuid for compatibility; deliberately no FK)
  child_id uuid NOT NULL,

  week_start date NOT NULL,
  week_end date NOT NULL,
  week_range text NOT NULL,

  ux_state text NOT NULL CHECK (ux_state IN ('A','B','C','D')),
  load_score integer NOT NULL DEFAULT 0,

  shape_of_the_week text,
  school_things_to_know jsonb NOT NULL DEFAULT '[]'::jsonb,
  moment_to_protect text,
  gentle_heads_up text,
  tiny_connection_idea jsonb,

  content_html text,
  content_text text,

  -- Midweek disruption addendums: array of objects {created_at, summary, kind}
  addendums jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Debugging: normalized inputs used to generate the snapshot
  raw_inputs jsonb,

  generated_at timestamptz NOT NULL DEFAULT now(),

  -- Engagement tracking
  opened_at timestamptz,
  last_opened_at timestamptz,
  open_count integer NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(parent_user_id, child_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_weekly_briefs_parent_week ON weekly_briefs(parent_user_id, week_start);
CREATE INDEX IF NOT EXISTS idx_weekly_briefs_child_week ON weekly_briefs(child_id, week_start);

-- updated_at trigger (set_updated_at() is defined in core migration)
DROP TRIGGER IF EXISTS weekly_briefs_updated_at ON weekly_briefs;
CREATE TRIGGER weekly_briefs_updated_at
BEFORE UPDATE ON weekly_briefs
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
