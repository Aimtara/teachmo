export type WeeklyBriefDisruption = {
  id: string | null;
  kind: 'early_dismissal' | 'late_start' | 'no_school' | 'conference' | 'testing';
  title: string;
  date: string;
  impact_hint: string;
};

export type WeeklyBriefCommunication = {
  source: 'announcement' | 'message';
  id: string | null;
  title: string;
  body: string;
  created_at: string | null;
  importance_score: number;
};

export type WeeklyBriefSummary = {
  week_start: string | null;
  week_end: string | null;
  child_context: {
    child_id: string | null;
    first_name: string | null;
    age_years: number | null;
    accommodations: string | null;
  };
  school_signals: {
    disruptions: WeeklyBriefDisruption[];
    events_count: number;
  };
  communications: {
    important: WeeklyBriefCommunication[];
    ignored_count: number;
  };
  family_anchors: {
    note?: string;
    defaults?: {
      weekday_rhythm?: string;
      weekend_rhythm?: string;
    };
  } | null;
  scenario_pool: WeeklyBriefScenario[];
  load_score: number;
  load_factors: {
    disruptions: number;
    important_comms: number;
    events_in_week: number;
  };
};

export type WeeklyBriefScenario = {
  id: string;
  title: string;
  description: string;
  script?: string;
  duration_minutes?: number;
};

export type WeeklyBriefDraft = {
  shape_of_the_week: string;
  school_things_to_know: Array<{ label: string; why: string }>;
  moment_to_protect?: string;
  gentle_heads_up: string;
  tiny_connection_idea: {
    title: string;
    description: string;
    script?: string;
  };
};

export type WeeklyBriefRunRecord = {
  id: string;
  organization_id: string | null;
  school_id: string | null;
  week_start_date: string;
  week_end_date: string;
  trigger: string;
  dry_run: boolean;
  status: string;
  started_at: string;
  finished_at: string | null;
  generated_count: number | null;
  error: string | null;
  created_by_user_id: string | null;
  created_by_role: string | null;
  metadata: Record<string, any> | null;
};

export type WeeklyBriefHistoryResponse = {
  history: { aggregate: { count: number | null } };
  prev: Array<{ id: string; opened_at: string | null }>;
};

export type WeeklyBriefParentsResponse = {
  guardian_children: Array<{
    guardian_id: string;
    child_id: string;
    guardian: {
      user_id: string;
      organization_id: string | null;
      school_id: string | null;
    } | null;
    child: {
      id: string;
      first_name: string | null;
      birthdate: string | null;
    } | null;
  }>;
};

export type WeeklyBriefEventsResponse = {
  calendar_events: Array<{
    id: string;
    title: string | null;
    description: string | null;
    starts_at: string;
  }>;
};

export type WeeklyBriefRunInsertResponse = {
  insert_weekly_brief_runs_one: { id: string } | null;
};

export type WeeklyBriefUpsertResponse = {
  insert_weekly_briefs_one: {
    id: string;
    ux_state: string;
    generated_at: string;
  } | null;
};

export type WeeklyBriefRunsResponse = {
  weekly_brief_runs: WeeklyBriefRunRecord[];
};
