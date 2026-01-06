create extension if not exists pgcrypto;

alter table public.audit_log
  add column if not exists before_snapshot jsonb,
  add column if not exists after_snapshot jsonb,
  add column if not exists contains_pii boolean not null default false,
  add column if not exists organization_id uuid,
  add column if not exists school_id uuid;

create table if not exists public.dsar_exports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  school_id uuid,
  requested_by uuid,
  subject_user_id uuid not null,
  status text not null default 'ready',
  export_data jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists dsar_exports_org_school_idx
  on public.dsar_exports (organization_id, school_id);

create index if not exists audit_log_org_school_idx
  on public.audit_log (organization_id, school_id, created_at);
