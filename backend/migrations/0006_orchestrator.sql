-- Phase 8: orchestrator router + specialists logging

create table if not exists orchestrator_runs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid,
  organization_id uuid,
  school_id uuid,
  user_id uuid,
  role text,
  channel text,
  route text not null,
  confidence numeric,
  input_text_hash text,
  missing_context jsonb not null default '{}'::jsonb,
  safety_level text not null default 'NONE',
  safety_reasons jsonb not null default '[]'::jsonb,
  success boolean not null default false,
  latency_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists idx_orchestrator_runs_org on orchestrator_runs(organization_id, school_id);
create index if not exists idx_orchestrator_runs_route on orchestrator_runs(route);
create index if not exists idx_orchestrator_runs_created_at on orchestrator_runs(created_at);

create table if not exists orchestrator_artifacts (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references orchestrator_runs(id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_orchestrator_artifacts_run on orchestrator_artifacts(run_id);
