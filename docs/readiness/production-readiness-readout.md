# Production Readiness Readout

Generated: 2026-05-04  
Latest closure validation commit: `57a109a` plus final docs commit

## Verdict

**GO for controlled pilot only after manual environment verification is completed. NO-GO for broad production launch today.**

Repository-controlled gates are materially stronger: runtime audit is clean, production aggregates pass, browser smoke/a11y automation runs, API-boundary exceptions are down to 21, and bundle/TS/API/lint ratchets block regression. Broad production still depends on live Nhost/Hasura/Sentry/storage/DNS/OAuth/legal/role-smoke evidence and human signoff that cannot be completed from this VM.

## Executive summary

This closure:

- Added operational automation workflows for dependency/security scans, visual regression, PR previews, schema/metadata validation, environment verification, secret rotation approvals, role smoke and Gate proofs, backup/restore and rollback drills, synthetic monitoring, compliance scanning, and AI governance reports.
- Added dry-run-first operational scripts that emit redacted JSON/Markdown reports and require protected GitHub Environment approvals before high-risk live actions such as production secret rotation, backup/restore, rollback, or alert test execution.
- Moved thirteen high-value direct UI backend calls behind domain adapters across discover, AI prompts, admin school requests/system health/tenant domains/users, and legacy tenant/profile hooks, reducing temporary API-boundary exceptions from 37 to 21 and adding a hard exception-count ratchet.
- Repaired browser QA posture: `npm run test:a11y` now runs under Vitest and passes; Playwright now passes 7 executable smoke tests with 5 explicitly skipped credential/environment tests.
- Fixed login page axe blockers by adding a main landmark and accessible submit-button contrast.
- Hardened E2E auth coverage so launch-gate route tests run with explicit local/test bypass flags, while production/staging bypass flags remain forbidden.
- Added scoped test-only feature flags for gated calendar/teacher-class browser smoke without changing production defaults.
- Tightened bundle policy to 596 kB total brotli, 23 kB app shell, and 214 kB largest chunk.
- Added manual evidence templates for directory identity conflict review, office-hours live verification, messaging/digest retry proof, assignments sync proof, and admin sync/dashboard validation.

The main remaining blockers are live operations/compliance evidence and 21 still-owned API-boundary exceptions, mostly broader admin/AI surfaces that need sequenced service-adapter migration.

## Remaining work snapshot

| Area | Before this pass | After this pass | Launch impact |
| --- | ---: | ---: | --- |
| Runtime high/critical audit findings | 0 | 0 | Runtime audit gate passes. |
| Full raw npm audit findings | 10 total / 4 high | 10 total / 4 high | Remaining highs are documented optional/dev PWA build-chain findings. |
| API-boundary temporary exceptions | 37 | 21 | Improved; remaining high-risk admin/AI exceptions need owner review before broad launch. |
| Lint ratchet | 940 problems, parser/no-undef 0 | 878 problems, parser/no-undef 0 | Controlled; full lint remains legacy debt. |
| TS ratchet `any` count | 512 baseline | 507 current | Improved after moving additional UI calls into typed domain adapters. |
| Bundle ratchet | 602/24/225 kB caps | 596/22.2/214 kB caps | Tighter regression gate; total JS remains above old 500 kB aggregate. |
| Browser E2E | 2 pass / 6 fail / 4 skipped | 7 pass / 0 fail / 5 skipped | Remaining skips require credentials/prod-like SW environment. |
| Role/Gate proof automation | Manual evidence templates only | Local Playwright role smoke 5 pass; Gate 2/3/4 proofs 7 pass with scoped flags | CI artifacts now provide repository proof; staging live proof still manual. |
| Operational automation workflows | Partial/scheduled Hasura only | 10 new/expanded workflows plus redacted reports | Provider tokens and protected environments required for live execution. |
| Unit a11y | FAIL under Jest runner | PASS: 5 files / 22 tests | `test:a11y` now uses Vitest. |
| Manual readiness | 26 manual items | 31 manual items with added evidence templates | Manual/live evidence remains production blocker. |

## Gate audit closure

| Gate item | Current repository status | Evidence | Remaining live/manual proof |
| --- | --- | --- | --- |
| E10 Directory flow | v0 flow exists; admin directory API moved behind domain adapter. | `src/domains/directory/admin.ts`; Gate 2 docs. | Role smoke with real directory data. |
| E11 Approvals + reason capture | v0 flow exists. | Directory approval pages/functions; conflict-review template. | Staging approval/rejection reason evidence. |
| E12 CSV/OneRoster-lite import | v0 dry-run/preview exists. | Import preview/job docs and templates. | Live import preview with redacted errors. |
| E13 Deterministic identity mapping | v0 implemented/tested. | Identity mapping tests and new conflict-review evidence template. | Manual conflict queue review proof. |
| E14 Messaging SLO + retries | Runbook/manual proof path exists. | Messaging/digest retry-proof template. | Staging retry/backoff/idempotency evidence. |
| E15 Digest reliability | Workflow exists; proof remains manual. | Digest runbook + retry-proof template. | Scheduled-run recovery evidence. |
| E16 Office hours booking | v0 domain/UI remains feature-gated; E2E can enable scoped smoke flags. | Office-hours domain/tests + live verification template. | Backend persistence/notifications and role smoke. |
| E17 Assignments sync v0 | Dry-run/status proof path documented. | Assignments sync evidence template. | LMS/mock dry-run and optional live sync evidence. |
| E18 Admin sync/troubleshooting | Partial v0; more admin adapters still needed. | Integration-health adapter and admin validation template. | Sync-now dry-run/live evidence. |
| E20 Dashboards validation | Partial v0. | Gate 4 docs + admin dashboard validation template. | Reconcile dashboards to real source events. |
| E22 Runbooks/support playbook | Runbooks exist. | Support playbook docs. | Publication/on-call workspace evidence. |
| E23 Command Center proof | v0 page/domain and template exist. | Command Center domain/page + live-proof template. | Live approval/escalation proof. |

## Technical blocker status

| Blocker | Status | Evidence |
| --- | --- | --- |
| Dependency audit | Runtime PASS; full raw audit still has documented dev/optional findings. | `npm run check:audit`; `npm audit --audit-level=high --omit=dev --omit=optional`. |
| API boundary | PASS with 21 exceptions and hard cap. | `npm run check:api-boundaries`. |
| Bundle | PASS with tighter 596/22.2/214 kB caps. | `npm run build`; `npm run check:size`. |
| TypeScript | PASS with current `any` below baseline. | `npm run check:ts-ratchet`; `npm run typecheck`. |
| Unit/smoke/backend tests | PASS. | Vitest, smoke, backend Jest, backend package Jest. |
| Browser E2E/a11y | PASS for executable smoke scope; 5 credential/environment skips. | `npm run test:e2e`; `npm run test:a11y`. |
| Operational automation | PASS for dry-run/reporting scope; live provider actions gated. | `ops:*` scripts, role/Gate Playwright specs, GitHub Actions workflows. |
| Full lint | Controlled by ratchet, not fully green. | `npm run check:lint-ratchet`; `npm run lint` still red at legacy baseline. |

## Tests and checks run

| Command | Result | Notes |
| --- | --- | --- |
| `npm ci` | PASS | Clean install; raw audit still reports 10 documented dev/optional findings. |
| `npm run check:production:fast` | PASS | Includes audit, secret hygiene, Nhost safety, API boundaries, auth safety, Hasura readiness, TS, PII, lint ratchets. |
| `npm run check:audit` | PASS | 0 high/critical runtime findings. |
| `npm audit --audit-level=high --omit=dev --omit=optional` | PASS | Runtime scope clean. |
| `npm audit --audit-level=high --json` | FAIL / documented | 10 total / 4 high optional/dev build-chain findings. |
| `npm run test:scripts` | PASS | 15 script tests. |
| `npm run check:schema-metadata` | PASS | 87 YAML/metadata checks pass; DB and live GraphQL typegen skip locally without credentials. |
| `CI=true npm run build-storybook` | PASS | Storybook static build succeeds; Chromatic upload requires token in CI. |
| `npm run ops:env-verify` | PASS / dry-run | Preview-mode report produced; staging/prod modes fail closed without secrets. |
| `npm run ops:secret-rotation` | PASS / dry-run | Rotation prepare report produced; no secrets generated or changed. |
| `npm run e2e:roles` | PASS | 5 role smoke tests passed locally after Playwright Chromium install. |
| `npm run e2e:gates` | PASS | 7 Gate 2/3/4 proof specs passed with scoped test feature flags; backend API proxy warnings are expected without local backend. |
| `npm run ops:backup-restore` | PASS / dry-run | Report produced; execution requires Postgres client tools and DB URLs. |
| `npm run ops:rollback-drill` | PASS / dry-run | Report produced; provider execution remains approval-gated. |
| `npm run ops:synthetic-monitor` | PASS / dry-run | Report produced; live URL/Sentry alert checks skip without credentials. |
| `npm run ops:compliance-report` | PASS | Secret hygiene, PII logging, and AI governance tests pass; gitleaks action runs in CI. |
| `npm run test:smoke` | PASS | 5 files / 15 tests. |
| `npm run test:a11y` | PASS | 5 files / 22 tests under Vitest. |
| `npm run typecheck` | PASS | TS compiler green. |
| `npm run check:ts-ratchet` | PASS | Current `any` count 507 vs baseline 512. |
| `npm run check:api-boundaries` | PASS | 21 documented exceptions. |
| `npm run check:lint-ratchet` | PASS | 878 controlled lint problems; parser/no-undef 0. |
| `npm run test -- --run` | PASS | 35 files / 145 tests. |
| `npm run test:backend` | PASS | Backend Jest green. |
| `npm test --prefix backend` | PASS | Backend package Jest green. |
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
| High | 21 API-boundary exceptions remain. | Continue adapter extraction under checker cap. | Admin/AI Platform | 2026-07-15 |
| High | Browser E2E skips still require credentials/prod-like SW setup. | Run skipped specs in staging with credentials; attach evidence. | QA/Release | TBD |
| High | Gate 2/3/4 live proof incomplete. | Use new evidence templates for E10–E23. | Product/Platform | TBD |
| Medium | Full lint remains red. | Continue ratcheted cleanup; parser/no-undef remain blocked at 0. | Frontend Platform | 2026-06-30 |
| Medium | Total JS still above old 500 kB aggregate. | Product approves hybrid policy or funds deeper reduction. | Performance Owner | 2026-06-15 |

## Recommended next steps

- **Next 7 days:** assign owners/dates to all manual items; rotate OAuth secret; run staging Nhost/Hasura/Sentry and role-smoke evidence.
- **Next 14 days:** complete backup/restore, rollback, DNS/TLS, storage, incident, and support/on-call drills; reduce admin/AI API exceptions.
- **Next 30 days:** complete compliance/privacy/AI governance reviews, live Gate 2/3/4 proof, production rehearsal, and continued lint/bundle/API-boundary burn-down.
