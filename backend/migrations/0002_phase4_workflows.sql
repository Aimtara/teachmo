-- Phase 4: Workflow & Automation
--
-- Adds tenant-scoped workflow definitions with auditable runs.

create extension if not exists pgcrypto;

create table if not exists workflow_definitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  school_id uuid,
  name text not null,
  description text,
  definition jsonb not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);

create index if not exists idx_workflow_definitions_org on workflow_definitions(organization_id);
create index if not exists idx_workflow_definitions_org_school on workflow_definitions(organization_id, school_id);

create table if not exists workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null,
  organization_id uuid not null,
  school_id uuid,
  actor_id uuid,
  status text not null,
  started_at timestamptz not null,
  finished_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_workflow_runs_org on workflow_runs(organization_id);
create index if not exists idx_workflow_runs_org_school on workflow_runs(organization_id, school_id);
