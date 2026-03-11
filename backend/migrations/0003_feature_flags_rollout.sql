-- Adds staged rollout controls for feature flags

create extension if not exists pgcrypto;

create table if not exists public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  school_id uuid,
  key text not null,
  enabled boolean not null default false,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.feature_flags
  add column if not exists rollout_percentage integer,
  add column if not exists canary_percentage integer,
  add column if not exists allowlist text[],
  add column if not exists denylist text[];

-- Uniqueness must handle nullable school_id correctly.
-- A single 3-column unique index allows duplicates when school_id is null,
-- so we use partial indexes for org-level and school-level scopes.
drop index if exists feature_flags_scope_key_idx;

-- De-duplicate any existing org-scope rows (school_id is null) that would
-- violate the new unique index on (organization_id, key).
with duplicates as (
  select
    id,
    row_number() over (
      partition by organization_id, key
      order by updated_at desc, created_at desc, id desc
    ) as rn
  from public.feature_flags
  where school_id is null
)
delete from public.feature_flags ff
using duplicates d
where ff.id = d.id
  and d.rn > 1;
create unique index if not exists feature_flags_org_key_idx
  on public.feature_flags (organization_id, key)
  where school_id is null;

create unique index if not exists feature_flags_org_school_key_idx
  on public.feature_flags (organization_id, school_id, key)
  where school_id is not null;

create index if not exists feature_flags_org_idx
  on public.feature_flags (organization_id);
