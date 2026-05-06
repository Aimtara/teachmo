-- Compliance foundations for consent, relationships, lifecycle requests, roster review,
-- directory approval, messaging delivery, incident response, and feature flag gates.

create extension if not exists pgcrypto;

create table if not exists public.guardian_student_relationships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  school_id uuid,
  guardian_id uuid not null,
  student_id uuid not null,
  state text not null default 'unverified'
    check (state in ('unverified', 'invited', 'school_verified', 'guardian_confirmed', 'revoked', 'disputed')),
  evidence_ref text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists guardian_student_relationships_scope_idx
  on public.guardian_student_relationships (organization_id, school_id, guardian_id, student_id, state);

create table if not exists public.consent_ledger (
  consent_id uuid primary key default gen_random_uuid(),
  actor_id uuid not null,
  actor_role text not null,
  child_id uuid,
  student_id uuid,
  school_id uuid,
  tenant_id uuid,
  organization_id uuid,
  consent_scope text not null,
  consent_status text not null check (consent_status in ('granted', 'revoked', 'expired', 'denied')),
  consent_version text not null,
  notice_version text not null,
  source text not null,
  granted_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz,
  evidence_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists consent_ledger_actor_scope_idx
  on public.consent_ledger (actor_id, student_id, consent_scope, created_at desc);

create table if not exists public.data_lifecycle_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  school_id uuid,
  request_type text not null check (request_type in ('export', 'deletion', 'access', 'anonymization')),
  status text not null default 'requested',
  requested_by uuid not null,
  subject_id uuid not null,
  subject_type text not null default 'user',
  scope text not null default 'subject',
  legal_hold boolean not null default false,
  contract_retention boolean not null default false,
  backup_handling_note text,
  result_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists data_lifecycle_requests_scope_idx
  on public.data_lifecycle_requests (organization_id, school_id, request_type, status, created_at desc);

create table if not exists public.roster_import_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  school_id uuid not null,
  source text not null default 'csv',
  status text not null default 'pending_review',
  duplicate_count integer not null default 0,
  ambiguous_count integer not null default 0,
  redacted_preview jsonb not null default '[]'::jsonb,
  created_by uuid,
  approved_by uuid,
  approved_at timestamptz,
  rollback_ref text,
  created_at timestamptz not null default now()
);

create table if not exists public.directory_connection_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  school_id uuid,
  actor_id uuid not null,
  state text not null default 'requested'
    check (state in ('requested', 'pending_school_review', 'approved', 'denied', 'expired', 'revoked')),
  private_data_revealed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messaging_delivery_queue (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  school_id uuid,
  message_id uuid,
  status text not null default 'queued'
    check (status in ('queued', 'sent', 'delivered', 'failed', 'suppressed')),
  attempts integer not null default 0,
  redacted_payload jsonb not null default '{}'::jsonb,
  next_attempt_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.privacy_incidents (
  incident_id uuid primary key default gen_random_uuid(),
  severity text not null,
  category text not null,
  affected_tenant_ids uuid[] not null default '{}',
  affected_subject_count integer not null default 0,
  affected_data_classes text[] not null default '{}',
  discovered_at timestamptz not null default now(),
  contained_at timestamptz,
  resolved_at timestamptz,
  status text not null default 'created',
  owner text not null,
  notes text
);

alter table if exists public.feature_flags
  add column if not exists owner text,
  add column if not exists reason text,
  add column if not exists required_gates jsonb not null default '[]'::jsonb,
  add column if not exists environment_overrides jsonb not null default '{}'::jsonb;
