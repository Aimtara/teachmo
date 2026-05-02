# Production Readiness Readout

Generated: 2026-05-01
Latest hardening commit validated locally: `90c3d69`

## Executive summary

Teachmo now has additive production-hardening gates for API boundary enforcement, deterministic environment parsing, production auth bypass safety, Hasura/Nhost artifact readiness, TypeScript regression ratcheting, and PII logging review. Runtime changes were intentionally conservative: existing routes and dashboards remain in place, env parsing now avoids string truthiness surprises, client-side internal-key usage was removed from the execution-board domain, and observability helpers redact sensitive fields before console/Sentry/analytics emission.

The repository is **not yet a full production GO** because live staging/production Nhost, Hasura permission, Sentry, backup/restore, monitoring, compliance, and real-user smoke verification require credentials and human evidence. The automated state supports a controlled pilot once the manual checklist is completed for the pilot environment.

## What changed

### Scripts/checks

- `scripts/check-api-boundaries.mjs`
- `scripts/check-production-auth-safety.mjs`
- `scripts/check-secret-hygiene.mjs`
- `scripts/check-hasura-readiness.mjs`
- `scripts/check-ts-ratchet.mjs`
- `scripts/check-pii-logging.mjs`
- Node tests for each script.

### CI/build

- Root and backend Dockerfiles now use lockfile-based `npm ci`.
- CI and launch-gates workflows now run the new static production safety checks.
- Package scripts now include `check:production:fast`, `check:production`, `check:launch`, `test:smoke`, and `test:scripts`.

### Source

- Added `src/config/env.ts` with deterministic env helpers and production/staging bypass rejection.
- Replaced unsafe env parsing in health/maintenance/auth/sentry/Nhost paths.
- Removed the former frontend internal API key header injection from `src/domains/executionBoard.ts`.
- Added `src/observability/redaction.ts` and `src/observability/events.ts`.
- Redacted observability/logger payloads before console/Sentry emission.
- Made `ProtectedRoute` testable in production-like mode without removing the existing dev convenience bypass.

### Tests

- Env helper tests.
- Healthz smoke test.
- Protected route production-like auth/role tests.
- Observability event/redaction tests.
- Static-check script tests.

### Docs

- Readiness status, inventory, manual production work, TS ratchet baseline, feature flag guide, observability guide, Hasura production readiness runbook, G4 runbook updates, README links.

## Tests and checks run

| Command | Result | Notes |
| --- | --- | --- |
| `npm run check:production:fast` | PASS | Preflight example, secret hygiene, API boundaries, auth safety, Hasura readiness, TS ratchet, PII logging. |
| `npm run test:smoke` | PASS | 5 files / 14 tests for env, healthz, protected route, observability. |
| `npm run test:scripts` | PASS | 7 node script tests. |
| `npm run typecheck` | PASS | `tsconfig.typecheck.json`. |
| `npm run build` | PASS | Vite production build completed. |
| `npm run test:backend` | PASS | Root Jest backend config passed. |
| `npm ci` in `backend/` | PASS with audit warnings | 8 npm audit findings reported by npm; not introduced by this work. |
| `npm test` in `backend/` | FAIL / pre-existing config issue | Backend package Jest config exposes `jest is not defined` in several ESM tests plus empty `sample.test.js`; root `npm run test:backend` passes. |
| `npm run lint` | FAIL / pre-existing lint debt | Thousands of existing lint errors/warnings across backend/src; not caused by this hardening slice. |
| `npm run test -- --run` | FAIL / pre-existing discovery/config issues | Vitest discovers `nhost/functions/node_modules` tests and several legacy mock-shape failures; focused smoke/script tests pass. |

## Desired future state validation

| Future state item | Achieved? | Evidence | Remaining gap |
| --- | --- | --- | --- |
| API boundary enforcement | Partial/automated | `npm run check:api-boundaries` passes with 44 explicit temporary exceptions. | Extract remaining UI direct GraphQL/fetch calls into domains/services. |
| Deterministic env flags | Yes | `src/config/env.ts`, env tests, no source `Boolean(import.meta.env...)`. | Continue migrating future flags through helper. |
| Production auth/bypass safety | Yes automated, live manual pending | `check:production-auth-safety`, bypass runtime assertions, ProtectedRoute tests. | Real staging/prod JWT/CORS/session validation. |
| Deterministic builds | Yes for Docker/CI patterns | Dockerfiles use `npm ci`; CI uses lockfiles. | Nhost functions deploy install path should be verified in provider runtime. |
| TS ratchet | Yes | Baseline JSON and `check:ts-ratchet`. | Continue incremental conversion slices. |
| Observability/audit/PII-safe logging | Partial | Event schema/redaction helpers/tests and PII logging gate. | Live Sentry/analytics/audit routing verification and remaining allowlisted log migration. |
| Launch gates/G4 | Strengthened | CI/launch-gates and G4 docs updated. | Real launch smoke with credentials. |
| Docs/manual work | Yes | `docs/readiness/manual-production-work.md`. | Owners/dates must be assigned by human release owner. |

## Existing functionality preservation

- No routes, pages, public APIs, domain exports, or workflows were deleted.
- Existing dev route-bypass behavior remains enabled by default in dev, but can be disabled for production-like tests with the dedicated disable-dev-route-bypass flag.
- Launch-gates mock/e2e bypass remains test-only and is blocked from staging/production by runtime/static checks.
- Healthz remains public and maintenance mode still excludes `/healthz`.

## Remaining blockers

See `docs/readiness/manual-production-work.md`. Highest priority:

1. Live staging and production Nhost verification.
2. Hasura metadata drift/export/import verification.
3. Role-by-role Hasura permission smoke.
4. Sentry DSN/release verification.
5. Backup/restore and rollback drills.
6. Real production/pilot smoke with parent, teacher, partner, admin, and ops users.
7. K-12 privacy/compliance, AI vendor/DPA, data retention, on-call, monitoring, DNS/cert, email redirect, storage, rate-limit, break-glass, and data deletion/export decisions.

## Verdict

**GO for controlled pilot only after manual environment verification is completed. NO-GO for broad production launch today.**

The automated codebase gates are materially stronger, but production readiness still depends on live infrastructure, compliance, and operational evidence that cannot be completed without privileged access.

## Next 7 / 14 / 30 days

- **7 days:** Assign owners/dates for manual checklist; verify staging Nhost/Hasura/Sentry; run role smoke; remove or service-adapt the highest-risk UI direct backend exceptions.
- **14 days:** Complete backup/restore and rollback drills; migrate admin/partner REST/fetch calls to services; wire live alert routing and incident rota.
- **30 days:** Complete compliance/privacy/AI governance reviews; finish remaining boundary exceptions; run production rehearsal with real pilot users and evidence capture.

## Rollback plan for this work

Revert hardening commits if a regression is traced to these changes. The most likely rollback targets are new scripts/workflows or env helper usage. Runtime-risk changes are limited to env parsing, auth bypass rejection in production/staging, execution-board client secret removal, and logging redaction.
