-- Phase 5: analytics + multi-tenancy

create extension if not exists pgcrypto;

create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  event_ts timestamptz not null default now(),
  organization_id uuid not null,
  school_id uuid,
  actor_id uuid,
  actor_role text,
  metadata jsonb not null default '{}'::jsonb,
  source text,
  created_at timestamptz not null default now()
);

create index if not exists idx_analytics_events_org on analytics_events(organization_id);
create index if not exists idx_analytics_events_org_school on analytics_events(organization_id, school_id);
create index if not exists idx_analytics_events_event on analytics_events(event_name);
create index if not exists idx_analytics_events_event_ts on analytics_events(event_ts);

create table if not exists ai_interactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  school_id uuid,
  actor_id uuid,
  actor_role text,
  child_id text,
  prompt text not null,
  response text not null,
  token_prompt integer,
  token_response integer,
  token_total integer,
  safety_risk_score numeric,
  safety_flags jsonb not null default '[]'::jsonb,
  model text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_interactions_org on ai_interactions(organization_id);
create index if not exists idx_ai_interactions_org_school on ai_interactions(organization_id, school_id);
create index if not exists idx_ai_interactions_created_at on ai_interactions(created_at);

create table if not exists tenant_settings (
  organization_id uuid not null,
  school_id uuid,
  branding jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, school_id)
);
