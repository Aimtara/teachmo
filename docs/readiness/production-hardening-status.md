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
| 8. QA/smoke | In progress | Added focused unit/script checks; final validation pending. | Browser e2e may require Playwright dependencies. |
| 9. Docs/readout | In progress | Readiness docs created and runbooks updated in this branch. | Final readout updated after validation. |
| 10. Final validation | Pending | Not yet complete. | Awaiting full command results. |

## GO / NO-GO summary

**Current recommendation:** GO for controlled pilot only after automated checks pass; **NO-GO for unrestricted production** until manual staging/production Nhost, Hasura permission, Sentry, backup/restore, and compliance tasks are evidenced.

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

STAGE 7 COMPLETE: observability and PII-safe logging gates added. Next: QA/e2e/accessibility launch validation.
