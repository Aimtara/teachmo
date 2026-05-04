# Teachmo Production Hardening Inventory

Generated: 2026-05-03  
Baseline commit: `5072202`  
Latest closure commit in this branch: `b14fbb8`

## Baseline environment

| Item | Value |
| --- | --- |
| Branch | `main` |
| Node | `v20.20.2` |
| npm | `10.8.2` |
| Lockfiles | `package-lock.json`, `backend/package-lock.json`, `nhost/functions/package-lock.json` |
| Workflows | 13 files under `.github/workflows` |
| Dockerfiles | `Dockerfile`, `backend/Dockerfile` |
| Nhost config | `nhost/nhost.toml` deployable safe-by-default; `nhost/nhost.local.example.toml` local-only unsafe example |

## Source and type counts

| Metric | Baseline/current evidence |
| --- | ---: |
| `.js` tracked files | 217 |
| `.jsx` tracked files | 488 |
| `.ts` tracked files after closure | 314 |
| `.tsx` tracked files | 65 |
| TS-ratchet `any` count | 451 |
| TS-ratchet `@ts-ignore` | 0 |
| TS-ratchet `@ts-expect-error` | 0 |
| API-boundary temporary exceptions before | 44 |
| API-boundary temporary exceptions after closure | 40 |

## Baseline command status

| Command | Baseline result | Current closure note |
| --- | --- | --- |
| `npm run check:production:fast` | PASS with false confidence | PASS after adding secret hygiene + Nhost config safety |
| `npm run test:scripts` | PASS, 7 tests | PASS, 15 tests |
| `npm run lint` | FAIL, 3619 problems | Still pre-existing broad lint debt; touched critical checks pass |
| `npm run typecheck` | PASS | PASS |
| `npm run build` | PASS | PASS |
| `npm run check:size` | FAIL, 598.37 kB / 500 kB | Still FAIL, 614 kB after vendor chunk split; budget decision required |
| `npm run test:smoke` | PASS, 14 tests | PASS, 15 tests |
| `npm run test -- --run` | FAIL, 25 failed files / 32 failed tests | Pre-existing broad Vitest failures remain |
| `npm run test:backend` | PASS, 30 suites / 186 tests | PASS when run from root config |
| `npm run check:launch` | PASS with false confidence | PASS after stronger safety gates, smoke, and build |
| `npm run check:production` | FAIL at lint | Still blocked by lint/full Vitest debt |

## Risks found and closure status

### Critical

- **Tracked OAuth secret-looking value** — removed from `nhost/nhost.toml`; scanner now detects `GOCSPX-`; manual rotation required.
- **Production-unsafe Nhost config** — deployable config is safe-by-default; local-only unsafe settings moved to `nhost.local.example.toml`; config safety gate added.
- **Hasura permission smoke skip-success** — protected workflows now fail closed with `REQUIRE_HASURA_SMOKE=true`.
- **Release gate false confidence** — aggregate scripts now include secret hygiene and Nhost config safety.

### High

- **API-boundary exceptions** — reduced from 44 to 40; remaining exceptions documented with owners/targets/replacements.
- **Force-push release script** — normal `ship` no longer force-pushes; legacy force-push path exits with warning.
- **Lint/full Vitest/bundle blockers** — documented as broad existing readiness blockers; not falsely marked green.
- **PII logging** — scanner/redaction tests strengthened for child/student data, prompts, vendor payloads, auth headers, addresses, and tokens.

### Medium

- **TS migration debt** — ratchet remains active and passes; new domain code is TypeScript.
- **Observability/live alerting evidence** — runbook and manual evidence requirements added.

### Low

- **Docs/indexing gaps** — readiness, runbook, evidence, and SWOT docs updated/added.

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
- A deprecated client-visible internal API key env var exposed a secret-looking value in frontend code; it has been removed and replaced with authenticated user/session context.

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
