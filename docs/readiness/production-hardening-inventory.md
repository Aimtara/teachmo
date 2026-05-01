# Teachmo Production Hardening Inventory

Generated: 2026-05-01T22:15:00Z  
Commit: `e472b0c`

## Commands Run

- `git status --short`
- `git rev-parse --short HEAD`
- `node --version`
- `npm --version`
- `git ls-files '*.js' '*.jsx' '*.ts' '*.tsx'`
- repository scans for env flags, direct backend access, Base44/compat usage, bypass flags, logging, Sentry, audit, and healthz.

## Raw Counts

| Metric | Count |
| --- | ---: |
| `.js` tracked files | 217 |
| `.jsx` tracked files | 488 |
| `.ts` tracked files | 305 |
| `.tsx` tracked files | 63 |
| `any` in TS/TSX | 451 |
| `@ts-ignore` | 0 |
| `@ts-expect-error` | 0 |
| `Boolean(import.meta.env` | 2 |
| `import.meta.env.VITE_` | 22 |
| `graphqlRequest` | 133 |
| `apiClient.entity` | 48 |
| platform/entity maps | 20 |
| `compatClient` | 39 |
| `base44` | 47 |
| `fetch(` | 161 |
| bypass/auth mode flags | 30 |
| `console.log` | 31 |
| `Sentry` | 20 |
| `audit` | 827 |
| `logEvent` | 19 |
| `healthz` | 16 |

## Risks Found

### Critical
- UI direct backend access existed in pages/hooks/components.
- Dev/e2e bypass flags lacked centralized production/staging rejection.
- `VITE_INTERNAL_API_KEY` exposed a secret-looking value in frontend code.

### High
- Dockerfiles used nondeterministic `npm install` patterns.
- Production checks were not aggregated in package scripts or CI.
- Live Hasura/Nhost permissions require manual verification with credentials.
- Logging gates did not enforce PII-safe usage.

### Medium
- Feature flag parsing was decentralized.
- TypeScript migration had no committed ratchet baseline/check.
- Observability event schema was not centralized.
- Healthz/protected-route production behavior needed explicit coverage.

### Low
- Readiness and G4 runbook documentation was incomplete.

## Files Requiring Follow-up

- UI pages/hooks currently allowlisted by `scripts/check-api-boundaries.mjs` for direct GraphQL/fetch migration.
- Hasura metadata and permissions need live staging/production verification.
- Sentry release/DSN behavior needs live project validation.
- Production smoke tests require real role-backed users.

## Assumptions

- Nhost/Hasura remains the source of truth for auth, permissions, core data, and audit.
- Launch-gates test-mode bypass is intentional and remains restricted to CI/test/local only.
- Broad admin UI refactors are deferred behind documented temporary exceptions to preserve behavior.
