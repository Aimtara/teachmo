# Production Readiness Readout

Generated: 2026-05-05
Latest verified commit before final validation: `2bd288e` plus this closure branch

## May 5 final closure sprint readout

### Verdict

**GO for controlled pilot only after critical live environment verification. NO-GO for broad production today.**

### Executive summary

Repository-controlled readiness improved: full root high/critical npm audit findings are now **0**, runtime audit remains **0 high/critical**, API-boundary exceptions remain **0**, command-center API routes now require admin auth, message telemetry no longer stores message-body previews, SIS roster import supports dry-run identity preview without roster mutation, and Gate 3 domain proof now covers messaging retry/idempotency, assignments dry-run status, and office-hours reschedule/permission behavior. Broad production still requires live Nhost/Hasura/RBAC/Sentry/storage/DNS/OAuth/legal/privacy/AI governance/support evidence and human signoff.

### Security debt burn-down

| Finding / package / surface | Before | After | Action taken | Runtime exposure | Residual risk | Owner/date |
| --- | ---: | ---: | --- | --- | --- | --- |
| `vite-plugin-pwa` / Workbox / `serialize-javascript` | 3 high in full audit chain | 0 high | Added `serialize-javascript@7.0.5` override and regenerated lockfile. | Optional build tooling only; runtime audit omits dev/optional. | Moderate `ajv`, Storybook `uuid`, and `diff` remain tracked as non-runtime. | Frontend Platform / 2026-06-30 |
| Runtime high/critical audit | 0 | 0 | Re-ran `npm run check:audit`. | None found. | Keep runtime gate mandatory. | Security Owner / ongoing |
| Audit exceptions schema | Owner/expiry fields | Owner/expiry/review command | `check:audit` now requires `reviewCommand`. | N/A | Exceptions expire and must be reviewed. | Security Owner / 2026-06-30 |
| PII message telemetry | Message preview was inserted in analytics metadata | Preview removed; `preview_redacted: true` | Hardened send-message telemetry and PII logging test coverage. | Runtime function path. | Live log/Sentry redaction proof still manual. | Messaging Owner / staging proof |

### API-boundary burn-down

| Domain | Before exceptions | After exceptions | Files refactored | Remaining exceptions | Notes |
| --- | ---: | ---: | --- | ---: | --- |
| UI API-boundary register | 0 active / stale allowlist entries | 0 active / no allowlist entries | `scripts/check-api-boundaries.mjs` | 0 | Checker ratchets at zero and no longer carries stale admin/AI allowlist rows. |
| Command Center | Domain adapter existed | Authenticated adapter | `src/domains/commandCenter.ts`, `backend/routes/commandCenter.js` | 0 | Backend route now denies unauthenticated/non-admin requests. |

### Gate 2 closure

| Target | Status | Tests | Evidence template | Feature flag / launch decision | Remaining work |
| --- | --- | --- | --- | --- | --- |
| Directory flow | Repository v0 | Gate smoke + docs | Gate 2 template | Controlled pilot after live role smoke | Real staging data proof. |
| CSV/OneRoster-lite import preview | Improved | SIS import Jest dry-run preview | Gate 2 template | Dry-run safe by request flag | Staging upload evidence. |
| Identity mapping | Implemented | Identity mapping Jest + SIS preview assertion | Gate 2 template | Pilot candidate | Manual conflict queue evidence. |
| Approval/rejection reason capture | Implemented/reasoned | Function paths + docs | Gate 2 template | Required for rejection | Staging audit screenshot/log. |
| PII-safe logging | Improved | `check:pii-logging`, script tests | Gate 2 template | Required | Live logs redaction proof. |

### Gate 3 closure

| Target | Status | Tests | Evidence template | Feature flag / launch decision | Remaining work |
| --- | --- | --- | --- | --- | --- |
| Messaging retries/idempotency | Repository policy helper added | `messagingReliability.test.ts` | Gate 3 template | Pilot with staging retry proof | Wire live queue metrics/evidence. |
| Digest reliability | Existing outbox dedupe/recovery path | Existing function docs; final live proof manual | Gate 3 template | Pilot after scheduler evidence | Staging recovery run. |
| Assignments sync | Dry-run status helper added | Domain dry-run coverage via final Vitest scope | Gate 3 template | Dry-run only for pilot | LMS/mock tenant proof. |
| Office-hours booking | Improved v0 | Availability, booking, cancel, reschedule, permission tests | Gate 3 template | Feature-gated/scoped tenant only | Backend persistence + notifications. |

### Gate 4 closure

| Target | Status | Tests | Evidence template | Feature flag / launch decision | Remaining work |
| --- | --- | --- | --- | --- | --- |
| Admin sync-now | Repo surfaces exist | Gate smoke/manual template | Gate 4 template | Pilot after live sync proof | Staging sync-now result/error proof. |
| Troubleshooting visibility | Repo surfaces exist | Gate smoke/manual template | Gate 4 template | Pilot after live data proof | Attach source logs. |
| Analytics reconciliation | Template-backed | Manual reconciliation template | Gate 4 template | No broad launch until reconciled | Source-event validation. |
| Command-center approvals/escalations | Auth hardened | Backend non-admin/admin tests | Gate 4 template | Pilot after live escalation proof | Replace file store for broad launch if required. |
| Non-admin denial | Verified in backend test | `commandCenter.test.js` | Gate 4 template | Required | Browser role proof with live users. |

### Validation results

| Command | Result | Notes |
| --- | --- | --- |
| `npm ci` | PASS baseline | Clean install completed; full audit initially had 3 high before override. |
| `npm run check:production:fast` | PASS baseline | Fast checks passed before implementation. |
| `npm audit --audit-level=high` | PASS after fix | 0 high / 0 critical; 6 total non-runtime lower-severity findings remain. |
| `npm run check:audit` | PASS | Runtime high/critical findings remain 0. |
| `npm run check:api-boundaries` | PASS | 0 temporary exceptions. |
| `npm run check:pii-logging` | PASS | 1096 files scanned after telemetry/check hardening. |
| Targeted Gate/security tests | PASS | Script tests, office-hours/messaging reliability Vitest, SIS import Jest, command-center Jest. |

### Manual/live evidence still required

OAuth secret rotation, staging/prod Nhost verification, Hasura/RBAC verification, real role smoke, Sentry/alert proof, backup/restore, rollback, DNS/TLS, storage permissions, legal/privacy, AI governance, support/on-call, and live Gate 2/3/4 proof remain manual blockers.

### Launch recommendation

Internal demo/dev remains GO with ratchets. Controlled pilot is GO only after critical live environment verification and scoped Gate acceptance. Broad production remains NO-GO.

### Next 7 / 14 / 30 days

| Window | Actions | Owner placeholder |
| --- | --- | --- |
| 7 days | Rotate OAuth secret; run staging Nhost/Hasura/RBAC, role-smoke, and Sentry proof; attach Gate 2 dry-run import evidence. | Security / Platform / QA |
| 14 days | Complete backup/restore, rollback, DNS/TLS, storage, assignments dry-run, messaging/digest recovery, and command-center escalation proof. | Platform / Product |
| 30 days | Finish legal/privacy/AI governance, support/on-call publication, dashboard reconciliation, and broad-launch GO/NO-GO review. | Legal / Product / Exec |
| `npm run build` | PASS | Vite/PWA build succeeds. |
| `npm run check:size` | PASS | 595.34 kB total, 22.09 kB initial, 213.67 kB largest. |
| `npm run test:e2e` | PASS / scoped | 7 passed, 5 skipped for missing credentials/prod-like offline environment. |
| `npm run check:launch` | PASS | Fast checks + smoke + build + size. |
| `npm run check:production` | PASS | Fast checks + lint ratchet + typecheck + Vitest + build + size. |

## Files changed

- **Source/domain adapters:** admin/AI/discover/profile/tenant adapters, existing directory/partner/execution adapters, and related UI pages/components/hooks.
- **UI/a11y/auth:** `src/pages/Login.jsx`, `src/components/shared/ProtectedRoute.tsx`, `src/config/features.ts`, `src/config/routes.jsx`.
- **Tests/E2E:** Playwright admin/calendar/keyboard/ops/offline specs; `package.json` a11y script; AI transparency a11y mock.
- **Scripts/config:** API-boundary ratchet, bundle-size ratchet, Playwright config, `.gitignore`.
- **Docs/evidence:** readiness docs, Gate 2/3/4 docs, PR template, docs index, and five new live-evidence templates.

## Functionality preservation

- No product routes, migrations, backend routes, dashboards, or public APIs were removed.
- Added `/api/healthz` as a minimal unauthenticated synthetic-monitoring endpoint that returns service/build status without tenant, user, or database data.
- UI call-site behavior was preserved by moving raw `fetch`/`graphqlRequest` calls behind domain adapters that keep the same endpoint/query and response shapes.
- Production feature defaults remain unchanged; calendar/teacher-class browser smoke uses scoped `VITE_FEATURE_*` flags only in Playwright.
- Auth bypass remains forbidden for staging/production by existing safety checks; E2E bypass is explicit and local/test-scoped.

## New operational automation added

| Area | New artifacts | Evidence / approval behavior |
| --- | --- | --- |
| Dependency/security | `renovate.json`, dependency-security workflow, hardened `check-audit.mjs` | Safe dev patch automerge only after checks; high/critical runtime advisories require valid non-expired exceptions. |
| Visual regression | Storybook/Chromatic workflow and visual regression doc | Storybook builds on PRs; Chromatic fails on unapproved diffs when token is configured. |
| PR collaboration | CODEOWNERS, preview workflow, collaboration doc | Domain owners route reviews; preview deployment no-ops safely without Vercel/Netlify tokens. |
| Schema/metadata | `check:schema-metadata`, schema workflow, codegen config | YAML/registry validation runs without secrets; DB and live GraphQL typegen fail closed when required. |
| Environment/secrets | Env verification and secret-rotation scripts/workflows/docs | Reports are redacted; live rotations require protected environment approval and `--execute`. |
| Role/Gate proofs | Role smoke and Gate 2/3/4 Playwright specs, report aggregator, workflow | Local proof passes; staging mode requires real base URL/role users and human review for high-risk flows. |
| Backup/rollback | Backup/restore and rollback scripts/workflow/doc | Dry-run by default; production execution requires approval and provider/database credentials. |
| Synthetic monitoring | `/api/healthz`, synthetic Playwright/spec script/workflow/doc | Scheduled checks can hit production; Sentry/alert tests require explicit env flags and credentials. |
| Compliance/AI governance | gitleaks config, compliance workflow/report script/doc | Secret hygiene, PII logging, AI governance tests, and gitleaks run in CI with report artifacts. |

## Manual work still required

Highest-priority manual work remains:

1. Rotate the exposed Google OAuth client secret and attach evidence.
2. Verify staging/production Nhost settings and Hasura metadata/permissions.
3. Run real role smoke for parent, teacher, partner, admin, and ops users.
4. Verify Sentry release/redaction/alert routing.
5. Complete backup/restore, rollback, incident, DNS/TLS, storage, email/auth, rate-limit, and support/on-call drills.
6. Complete legal/privacy/AI vendor reviews.
7. Attach new evidence for directory identity conflicts, office hours, messaging/digest retries, assignments sync, and admin dashboard validation.

## Residual risks

| Severity | Risk | Mitigation | Owner | Target |
| --- | --- | --- | --- | --- |
| Critical | Live Nhost/Hasura/RBAC settings may differ from repo-safe config. | Complete MPW-001 through MPW-005 and MPW-024. | Platform/Security | TBD |
| Critical | Previously exposed OAuth secret may still be valid. | Complete MPW-023 rotation proof. | Security/Auth | TBD |
| Medium | Legacy lint/type debt remains under ratchets. | Continue typed migration and hook-refresh cleanup in focused batches. | Frontend Platform | 2026-07-31 |
| High | Browser E2E skips still require credentials/prod-like SW setup. | Run skipped specs in staging with credentials; attach evidence. | QA/Release | TBD |
| High | Gate 2/3/4 live proof incomplete. | Use new evidence templates for E10–E23. | Product/Platform | TBD |
| Medium | Full lint remains red. | Continue ratcheted cleanup; parser/no-undef remain blocked at 0. | Frontend Platform | 2026-06-30 |
| Medium | Total JS still above old 500 kB aggregate. | Product approves hybrid policy or funds deeper reduction. | Performance Owner | 2026-06-15 |

## Recommended next steps

- **Next 7 days:** assign owners/dates to all manual items; rotate OAuth secret; run staging Nhost/Hasura/Sentry and role-smoke evidence.
- **Next 14 days:** complete backup/restore, rollback, DNS/TLS, storage, incident, and support/on-call drills; reduce admin/AI API exceptions.
- **Next 30 days:** complete compliance/privacy/AI governance reviews, live Gate 2/3/4 proof, production rehearsal, and continued lint/bundle/API-boundary burn-down.
