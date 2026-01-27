-- Phase 7: observability + alerts + scheduled reports

create table if not exists api_request_metrics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  school_id uuid,
  method text not null,
  path text not null,
  status_code integer not null,
  latency_ms integer not null,
  error boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_api_request_metrics_org on api_request_metrics(organization_id, school_id);
create index if not exists idx_api_request_metrics_created_at on api_request_metrics(created_at);

create table if not exists alert_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  school_id uuid,
  name text not null,
  metric_key text not null,
  comparison text not null,
  threshold numeric,
  window_minutes integer not null default 60,
  anomaly boolean not null default false,
  anomaly_factor numeric,
  channel text not null default 'email',
  segment jsonb not null default '{}'::jsonb,
  cooldown_minutes integer not null default 60,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_alert_rules_org on alert_rules(organization_id, school_id);
create index if not exists idx_alert_rules_enabled on alert_rules(enabled);

create table if not exists alert_events (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references alert_rules(id) on delete cascade,
  organization_id uuid not null,
  school_id uuid,
  metric_value numeric,
  baseline_value numeric,
  status text not null default 'triggered',
  details jsonb not null default '{}'::jsonb,
  triggered_at timestamptz not null default now()
);

create index if not exists idx_alert_events_rule on alert_events(rule_id);
create index if not exists idx_alert_events_org on alert_events(organization_id, school_id);

create table if not exists scheduled_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  school_id uuid,
  name text not null,
  report_type text not null,
  frequency text not null,
  channel text not null default 'email',
  segment jsonb not null default '{}'::jsonb,
  next_run_at timestamptz,
  last_run_at timestamptz,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_scheduled_reports_org on scheduled_reports(organization_id, school_id);
create index if not exists idx_scheduled_reports_next_run on scheduled_reports(next_run_at);

create table if not exists scheduled_report_runs (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references scheduled_reports(id) on delete cascade,
  organization_id uuid not null,
  school_id uuid,
  run_at timestamptz not null default now(),
  status text not null default 'sent',
  payload jsonb not null default '{}'::jsonb
);

create index if not exists idx_scheduled_report_runs_report on scheduled_report_runs(report_id);
