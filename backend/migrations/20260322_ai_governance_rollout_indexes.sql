-- Forward-only rollout hardening for AI governance analytics.
-- This migration intentionally does NOT modify historical migrations.
-- It adds indexes to support the PR 3 governance dashboard queries.

create index if not exists idx_ai_interactions_created_at
  on ai_interactions (created_at desc);

create index if not exists idx_ai_interactions_governance_policy_outcome
  on ai_interactions ((metadata->'governance'->>'policyOutcome'));

create index if not exists idx_ai_interactions_governance_denial_reason
  on ai_interactions ((metadata->'governance'->>'denialReason'));

create index if not exists idx_ai_interactions_governance_required_skill
  on ai_interactions ((metadata->'governance'->>'requiredSkill'));

create index if not exists idx_ai_interactions_executed_skill
  on ai_interactions ((metadata->>'executedSkill'));

create index if not exists idx_ai_interactions_governance_metadata_gin
  on ai_interactions
  using gin (metadata jsonb_path_ops);
