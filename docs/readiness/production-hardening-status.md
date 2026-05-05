# Production Hardening Status

Generated: 2026-05-05

## Stage-by-stage status

| Stage | Status | Completed work | Blockers/manual follow-ups |
| --- | --- | --- | --- |
| 1. Baseline | Complete | Refreshed baseline at `5072202`: Node/npm, scripts, workflows, Dockerfiles, source counts, TS debt, checks, lint, tests, build, and bundle status. | None for automated baseline. |
| 2. Secrets/Nhost config | Complete | Removed tracked Google OAuth secret-looking value, made `nhost/nhost.toml` safe-by-default, added local-only example, broad secret scanner, Nhost config safety checker, and tests. | Google OAuth secret rotation is manual and critical. |
| 3. Hasura/RBAC | Complete | Permission smoke workflows now fail closed for protected/manual/scheduled contexts; readiness check validates workflow fail-closed posture and role-matrix docs. | Live role-by-role Hasura verification requires staging/prod credentials. |
| 4. API boundary | Complete for UI ratchet | Temporary exceptions are closed at 0; stale checker allowlist entries were removed so docs and enforcement match. | New UI direct backend/API calls fail `npm run check:api-boundaries`. |
| 5. CI/release | Complete | `ship` no longer force-pushes; release contract and CI/launch gates run explicit safety checks; Docker runtime no longer installs global `serve`. | Real deploy platform release evidence is manual. |
| 6. Static quality | Controlled/Improved | Typecheck, TS ratchet, full Vitest, root backend Jest, backend package Jest, lint ratchet, build, launch checks, and bundle-size ratchet pass. Follow-up lint burn-down lowered the cap to 878 problems with parser and `no-undef` held at zero. Bundle ratchet is 596 kB total / 22.2 kB initial / 214 kB largest chunk after lazy-loading the landing route from the app shell. | Full lint cleanup and deeper bundle budget decision require owner approval/remediation. |
| 7. Observability/PII logging | Complete | Redaction now covers nested arrays, auth material, AI prompts, vendor payload markers, addresses, child/student data, message bodies, and message preview telemetry; PII log tests strengthened. | Live Sentry/alert routing and audit insert proof remain manual. |
| 8. QA/smoke/ops drills | Partial/Improved | Existing smoke tests pass; Playwright browsers installed and E2E was stabilized to 7 passed / 5 credential-or-environment skipped. `npm run test:a11y` now runs under Vitest and passes 22 checks. Evidence templates added for staging/prod smoke, permission smoke, backup, rollback, incident rehearsal, DNS/TLS, storage, Sentry, OAuth, legal/privacy/AI, directory conflict review, office hours, messaging/digest retry, assignments sync, and admin dashboard validation. | Real role smoke/offline PWA proof still requires production-like credentials/build environment. |
| 9. Docs/SWOT | Complete | Added release contract, Nhost production config, Hasura permission smoke, observability/SLO runbook, API-boundary exceptions, evidence templates, SWOT closure. | Owners/target dates must be assigned by release owner. |
| 10. Final validation | Complete for automated gates | Safety/script/smoke/typecheck/build/backend checks, full Vitest, launch, production aggregate, lint ratchet, and size ratchet pass locally. | Full `npm run lint` remains intentionally controlled by ratchet; live environment checks still require credentials and human evidence. |

## GO / NO-GO summary

**Current recommendation:** GO for controlled pilot only after manual environment evidence is completed; **NO-GO for unrestricted production** until live Nhost/Hasura/Sentry/storage/DNS/OAuth/legal evidence, browser QA blockers, and Gate 2-4 live proof are resolved/evidenced.

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

MAY 5 CLOSURE UPDATE: production audit gate passes for runtime dependencies and full root high/critical audit findings are now 0 after a targeted `serialize-javascript@7.0.5` override for the optional Workbox/PWA build chain. Full Vitest/backend/smoke/launch/production aggregates remain the validation target; lint parser/no-undef are zero under a strict 517-problem ratchet, API-boundary exceptions are zero with no stale allowlist, E13 identity mapping dry-run preview and E16 office-hours reschedule coverage are tested, and Command Center APIs now enforce auth/admin middleware. Remaining blockers: live Nhost/Hasura/Sentry/storage/DNS/OAuth/compliance evidence, live role/offline proof, and final owner signoff.
