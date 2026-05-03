# Production Hardening Status

Generated: 2026-05-03

## Stage-by-stage status

| Stage | Status | Completed work | Blockers/manual follow-ups |
| --- | --- | --- | --- |
| 1. Baseline | Complete | Refreshed baseline at `5072202`: Node/npm, scripts, workflows, Dockerfiles, source counts, TS debt, checks, lint, tests, build, and bundle status. | None for automated baseline. |
| 2. Secrets/Nhost config | Complete | Removed tracked Google OAuth secret-looking value, made `nhost/nhost.toml` safe-by-default, added local-only example, broad secret scanner, Nhost config safety checker, and tests. | Google OAuth secret rotation is manual and critical. |
| 3. Hasura/RBAC | Complete | Permission smoke workflows now fail closed for protected/manual/scheduled contexts; readiness check validates workflow fail-closed posture and role-matrix docs. | Live role-by-role Hasura verification requires staging/prod credentials. |
| 4. API boundary | Partial/Improved | Reduced temporary exceptions from 44 to 40 by moving messaging translation, teacher dashboard, assignments, and security status calls behind domain modules. | 40 exceptions remain, mostly admin/AI/partner/directory surfaces. |
| 5. CI/release | Complete | `ship` no longer force-pushes; release contract and CI/launch gates run explicit safety checks; Docker runtime no longer installs global `serve`. | Real deploy platform release evidence is manual. |
| 6. Static quality | Partial/Improved | Typecheck and TS ratchet pass; vendor chunks split for analysis; bundle remains over budget and full lint remains pre-existing red. | Bundle budget and lint debt require owner approval/remediation. |
| 7. Observability/PII logging | Complete | Redaction now covers nested arrays, auth material, AI prompts, vendor payload markers, addresses, child/student data; PII log tests strengthened. | Live Sentry/alert routing and audit insert proof remain manual. |
| 8. QA/smoke/ops drills | Complete for docs/templates | Existing smoke tests pass; evidence templates added for staging/prod smoke, permission smoke, backup, rollback, incident rehearsal. | Browser e2e and real role smoke require running app/live credentials. |
| 9. Docs/SWOT | Complete | Added release contract, Nhost production config, Hasura permission smoke, observability/SLO runbook, API-boundary exceptions, evidence templates, SWOT closure. | Owners/target dates must be assigned by release owner. |
| 10. Final validation | Pending final pass | Safety/script/smoke/typecheck/build/backend checks are being run after changes. | Full lint, full Vitest, and bundle are expected documented blockers unless fixed. |

## GO / NO-GO summary

**Current recommendation:** GO for controlled pilot only; **NO-GO for unrestricted production** until manual staging/production Nhost, Hasura permission, Sentry, backup/restore, compliance tasks, and pre-existing broad-suite failures are resolved/evidenced.

## Commands added

- `npm run check:api-boundaries`
- `npm run check:production-auth-safety`
- `npm run check:hasura-readiness`
- `npm run check:ts-ratchet`
- `npm run check:pii-logging`
- `npm run check:secret-hygiene`
- `npm run check:nhost-config-safety`
- `npm run check:production:fast`
- `npm run check:production`
- `npm run check:launch`
- `npm run test:smoke`

## Latest stage update

STAGE 9 COMPLETE: documentation and SWOT closure updated. Remaining manual items: credentialed Nhost/Hasura/Sentry/ops/compliance evidence, Google OAuth secret rotation, bundle/lint/full-test remediation or formal acceptance. Next: final validation.
