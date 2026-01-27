-- Phase 6: AI governance, prompts, budgets, and review workflows

create extension if not exists pgcrypto;

alter table if exists ai_interactions
  add column if not exists prompt_id uuid,
  add column if not exists prompt_version_id uuid,
  add column if not exists inputs jsonb not null default '{}'::jsonb,
  add column if not exists outputs jsonb not null default '{}'::jsonb,
  add column if not exists user_id uuid,
  add column if not exists reviewer_status text,
  add column if not exists reviewer_id uuid,
  add column if not exists reviewed_at timestamptz,
  add column if not exists cost_usd numeric,
  add column if not exists latency_ms integer;

create index if not exists idx_ai_interactions_prompt on ai_interactions(prompt_id);
create index if not exists idx_ai_interactions_model on ai_interactions(model);

create table if not exists ai_prompt_definitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  school_id uuid,
  name text not null,
  description text,
  is_archived boolean not null default false,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ai_prompt_definitions_org on ai_prompt_definitions(organization_id);
create index if not exists idx_ai_prompt_definitions_org_school on ai_prompt_definitions(organization_id, school_id);

create table if not exists ai_prompt_versions (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null references ai_prompt_definitions(id) on delete cascade,
  version integer not null,
  content text not null,
  variables jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_ai_prompt_versions_prompt_version on ai_prompt_versions(prompt_id, version);
create index if not exists idx_ai_prompt_versions_active on ai_prompt_versions(prompt_id) where is_active;

create table if not exists ai_tenant_budgets (
  organization_id uuid not null,
  school_id uuid,
  monthly_limit_usd numeric,
  spent_usd numeric not null default 0,
  reset_at timestamptz,
  fallback_policy text not null default 'block',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, school_id)
);

create table if not exists ai_model_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  school_id uuid,
  default_model text not null,
  fallback_model text,
  allowed_models jsonb not null default '[]'::jsonb,
  feature_flags jsonb not null default '[]'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_ai_model_policies_org_school on ai_model_policies(organization_id, school_id);

create table if not exists ai_cost_ledger (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  school_id uuid,
  interaction_id uuid references ai_interactions(id) on delete set null,
  model text,
  token_total integer,
  cost_usd numeric,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_cost_ledger_org on ai_cost_ledger(organization_id);

create table if not exists ai_review_queue (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  school_id uuid,
  interaction_id uuid not null references ai_interactions(id) on delete cascade,
  status text not null default 'pending',
  reason text,
  requested_by uuid,
  reviewer_id uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_review_queue_org on ai_review_queue(organization_id);
create index if not exists idx_ai_review_queue_status on ai_review_queue(status);

create table if not exists ai_review_actions (
  id uuid primary key default gen_random_uuid(),
  queue_id uuid not null references ai_review_queue(id) on delete cascade,
  action text not null,
  actor_id uuid,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_review_actions_queue on ai_review_actions(queue_id);
