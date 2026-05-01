# Production Hardening Status

Generated: 2026-05-01

## Stage-by-stage status

| Stage | Status | Completed work | Blockers/manual follow-ups |
| --- | --- | --- | --- |
| 1. Baseline | Complete | Captured repository, tooling, CI, Docker, Nhost/Hasura, TS, env, boundary, auth, logging, and healthz baseline. | None for automated baseline. |
| 2. Architecture boundary | Complete | Added `check:api-boundaries` with explicit temporary exceptions for legacy UI raw backend calls. | Broad UI GraphQL/fetch refactors remain manual/follow-up before full production GO. |
| 3. Env/auth bypass safety | Complete | Added deterministic env helper and migrated healthz, maintenance, routing, auth bypass, Sentry, Nhost config, and execution-board secret handling. | Real staging/prod env validation requires deploy access. |
| 4. Auth/RBAC/Hasura | Complete | Added production auth safety and Hasura readiness checks. | Live Hasura permission verification remains manual. |
| 5. Build/CI | Complete | Dockerfiles use lockfile-based installs; CI/launch gates run new checks; production aggregate scripts added. | None. |
| 6. TypeScript ratchet | Complete | Added committed TS ratchet baseline and regression check. | Owners must refresh intentionally after TS migration slices. |
| 7. Observability/PII logging | Complete | Added event schema/redaction helpers, redaction tests, PII logging check, and safer logger redaction. | Real Sentry/alert routing verification remains manual. |
| 8. QA/smoke | Complete | Added focused unit/script smoke checks and ran build/typecheck/backend checks. | Full Vitest/lint/backend-package suites expose pre-existing repository failures documented in the readout. Browser e2e not run in this pass. |
| 9. Docs/readout | Complete | Readiness docs, manual work register, runbooks, and final readout updated. | Manual production work remains open by design. |
| 10. Final validation | Complete with documented blockers | Fast production checks, script tests, smoke tests, typecheck, build, and root backend tests pass. | Existing lint/full Vitest/backend-package failures remain outside this hardening change. |

## GO / NO-GO summary

**Current recommendation:** GO for controlled pilot only; **NO-GO for unrestricted production** until manual staging/production Nhost, Hasura permission, Sentry, backup/restore, compliance tasks, and pre-existing broad-suite failures are resolved/evidenced.

## Commands added

- `npm run check:api-boundaries`
- `npm run check:production-auth-safety`
- `npm run check:hasura-readiness`
- `npm run check:ts-ratchet`
- `npm run check:pii-logging`
- `npm run check:secret-hygiene`
- `npm run check:production:fast`
- `npm run check:production`
- `npm run check:launch`
- `npm run test:smoke`

## Latest stage update

STAGE 10 COMPLETE: final validation run. Passing automated gates: fast production checks, smoke tests, script tests, typecheck, build, root backend tests. Blocked/pre-existing failures: lint, full Vitest, backend package Jest. Next: manual production verification and cleanup of pre-existing suite failures.
