-- Adds staged rollout controls for feature flags

alter table if exists public.feature_flags
  add column if not exists rollout_percentage integer,
  add column if not exists canary_percentage integer,
  add column if not exists allowlist text[],
  add column if not exists denylist text[];

create unique index if not exists feature_flags_scope_key_idx
  on public.feature_flags (organization_id, school_id, key);
