# Production Hardening Status

Generated: 2026-05-03

## Stage-by-stage status

| Stage | Status | Completed work | Blockers/manual follow-ups |
| --- | --- | --- | --- |
| 1. Baseline | Complete | Refreshed baseline at `5072202`: Node/npm, scripts, workflows, Dockerfiles, source counts, TS debt, checks, lint, tests, build, and bundle status. | None for automated baseline. |
| 2. Secrets/Nhost config | Complete | Removed tracked Google OAuth secret-looking value, made `nhost/nhost.toml` safe-by-default, added local-only example, broad secret scanner, Nhost config safety checker, and tests. | Google OAuth secret rotation is manual and critical. |
| 3. Hasura/RBAC | Complete | Permission smoke workflows now fail closed for protected/manual/scheduled contexts; readiness check validates workflow fail-closed posture and role-matrix docs. | Live role-by-role Hasura verification requires staging/prod credentials. |
| 4. API boundary | Partial/Improved | Reduced temporary exceptions from 40 to 37 in this closure by moving CCPA location, integration service connect, and integration health calls behind domain modules. | 37 exceptions remain, mostly admin/AI/partner/directory surfaces. |
| 5. CI/release | Complete | `ship` no longer force-pushes; release contract and CI/launch gates run explicit safety checks; Docker runtime no longer installs global `serve`. | Real deploy platform release evidence is manual. |
| 6. Static quality | Controlled/Improved | Typecheck, TS ratchet, full Vitest, root backend Jest, backend package Jest, lint ratchet, build, launch checks, and bundle-size ratchet pass. Lint debt reduced to 940 problems with parser and `no-undef` held at zero. | Full lint cleanup and deeper bundle budget decision require owner approval/remediation. |
| 7. Observability/PII logging | Complete | Redaction now covers nested arrays, auth material, AI prompts, vendor payload markers, addresses, child/student data; PII log tests strengthened. | Live Sentry/alert routing and audit insert proof remain manual. |
| 8. QA/smoke/ops drills | Partial/Improved | Existing smoke tests pass; Playwright browsers installed and E2E was rerun; evidence templates added for staging/prod smoke, permission smoke, backup, rollback, incident rehearsal, DNS/TLS, storage, Sentry, OAuth, and legal/privacy/AI review. | Playwright has product/test blockers documented in browser readiness; real role smoke requires live credentials. |
| 9. Docs/SWOT | Complete | Added release contract, Nhost production config, Hasura permission smoke, observability/SLO runbook, API-boundary exceptions, evidence templates, SWOT closure. | Owners/target dates must be assigned by release owner. |
| 10. Final validation | Complete for automated gates | Safety/script/smoke/typecheck/build/backend checks, full Vitest, launch, production aggregate, lint ratchet, and size ratchet pass locally. | Full `npm run lint` remains intentionally controlled by ratchet; live environment checks still require credentials and human evidence. |

## GO / NO-GO summary

**Current recommendation:** GO for controlled pilot only after manual environment evidence is completed; **NO-GO for unrestricted production** until live Nhost/Hasura/Sentry/storage/DNS/OAuth/legal evidence, browser QA blockers, and remaining high-risk API exceptions are resolved/evidenced.

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
- `npm run check:lint-ratchet`
- `npm run lint:production`
- `npm run check:audit`

## Latest stage update

REMAINING-WORK CLOSURE UPDATE: production audit gate passes for runtime dependencies, full Vitest/backend/smoke/launch/production aggregates pass, lint parser/no-undef are zero under a stricter ratchet, API-boundary exceptions are down to 37, E13 identity mapping v0 and E16 office-hours v0 are implemented/tested, and manual evidence templates are executable. Remaining blockers: live Nhost/Hasura/Sentry/storage/DNS/OAuth/compliance evidence, Playwright a11y/routing/product-scope failures, and remaining high-risk API-boundary exceptions.
