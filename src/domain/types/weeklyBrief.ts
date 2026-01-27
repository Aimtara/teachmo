export type WeeklyBriefRecord = {
  id: string;
  parent_user_id?: string | null;
  child_id?: string | null;
  week_start: string;
  week_end: string;
  week_range: string;
  ux_state?: string | null;
  load_score?: number | null;
  shape_of_the_week?: string | null;
  school_things_to_know?: Array<{ label: string; why: string }>;
  moment_to_protect?: string | null;
  gentle_heads_up?: string | null;
  tiny_connection_idea?: {
    title: string;
    description: string;
    script?: string;
  } | null;
  content_html?: string | null;
  content_text?: string | null;
  open_count?: number | null;
  opened_at?: string | null;
  last_opened_at?: string | null;
  last_opened_source?: string | null;
};

export type WeeklyBriefListFilters = {
  weekStart?: string;
};
