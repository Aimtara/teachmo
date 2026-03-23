# AI Governance Rollout Hardening

## Status
Accepted

## Context

Teachmo now has:

- a completion-time governance layer
- governed tool execution
- verifier-backed response checks
- admin reporting for governance outcomes

The production rollout must preserve current defaults while allowing tenant-by-tenant enablement.

Current backend behavior already assumes:

- backend local default port remains `4000`
- production CORS is allowlist-based
- backend migrations are forward-only files applied from `backend/migrations`

This ADR preserves those assumptions.

## Decision

### 1. Keep current defaults

- Default backend port remains `4000`
- Existing `PORT` behavior still works
- Replit-specific behavior is opt-in only
- No unconditional wildcard origin expansion is allowed

### 2. Add env-gated local/dev overrides

- `DEV_BACKEND_PORT`
  - Optional local/dev override for backend port
  - Does not replace `PORT`
- `ALLOW_REPLIT_ORIGINS=true`
  - Allows recognized Replit preview origins in CORS
  - Disabled by default

### 3. Roll out governance with feature flags

The following flags control activation:

- `ENTERPRISE_AI_GOVERNANCE`
  - Enables governance evaluation and admin governance surfaces
- `AI_TOOL_GOVERNANCE`
  - Enables `/api/ai/tool`
- `AI_VERIFIER_ENFORCEMENT`
  - Enables verifier-backed enforcement behavior
- `ENTERPRISE_AI_REVIEW`
  - Enables governance review queue workflows

### 4. Use forward-only migrations

Do not edit prior migrations.

Add new migrations only for:

- performance indexes
- new governance tables or columns
- future rollout support

## Consequences

### Positive

- No disruption to current local setup
- No Replit-specific defaults leaking into mainline
- Safer tenant-by-tenant rollout
- Governance dashboard queries are index-backed

### Tradeoffs

- Operators must explicitly enable flags
- Some environments may require additional allowlist setup

## Operator Rollout Checklist

1. Enable `ENTERPRISE_AI_GOVERNANCE` for internal test tenants first.
2. Validate completion logging and governance outcomes.
3. Enable `AI_TOOL_GOVERNANCE` only after governed skills are verified.
4. Enable `AI_VERIFIER_ENFORCEMENT` after verifier false-positive review.
5. Keep `ALLOW_REPLIT_ORIGINS` off unless Replit preview access is required.

## Example environment configuration

```bash
# Keep existing production/default behavior
PORT=4000

# Optional local override
DEV_BACKEND_PORT=4100

# Only when Replit preview support is needed
ALLOW_REPLIT_ORIGINS=false
```

## Notes

Feature flag records are tenant-scoped operational data and should be created via the existing feature flag admin flow or operational SQL runbooks, not baked into a global schema migration.
