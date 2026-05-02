-- Follow-up to 0003_feature_flags_rollout.sql
-- Removes duplicate org-scope rows before enforcing the unique index and adds
-- a supporting index on organization_id for query performance.
-- This is a separate migration so that databases that already applied
-- 0003_feature_flags_rollout.sql receive these additional changes.

-- De-duplicate any existing org-scope rows (school_id is null) that would
-- violate the unique index on (organization_id, key).
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

create index if not exists feature_flags_org_idx
  on public.feature_flags (organization_id);
