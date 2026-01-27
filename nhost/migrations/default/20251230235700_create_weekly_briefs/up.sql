-- Weekly Family Brief
-- Stores an immutable snapshot per parent/child/week.

CREATE TABLE IF NOT EXISTS weekly_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id uuid REFERENCES public.children(id) ON DELETE SET NULL,

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

  raw_inputs jsonb,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(parent_user_id, child_id, week_start)
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_weekly_briefs_parent_user ON weekly_briefs(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_briefs_week_start ON weekly_briefs(week_start);

-- Keep updated_at fresh
DROP TRIGGER IF EXISTS weekly_briefs_updated_at ON weekly_briefs;
CREATE TRIGGER weekly_briefs_updated_at
BEFORE UPDATE ON weekly_briefs
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
