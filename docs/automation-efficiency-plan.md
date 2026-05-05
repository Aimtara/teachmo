# Operational Automation Efficiency Plan

Generated: 2026-05-04  
Status: implemented in repository automation; live provider execution remains approval-gated  
Owner placeholders: Engineering Platform, Security, QA/Release, DevOps, Product, Legal/Privacy

## Purpose

This plan captures Teachmo's current operational baseline and the automation
roadmap for dependency management, security scanning, visual regression, PR
collaboration, database/metadata validation, environment verification, secret
rotation, role smoke tests, Gate 2/3/4 proofs, backup/restore drills,
synthetic monitoring, compliance checks, AI governance, and final readiness
evidence.

Automation must preserve existing product behavior and keep high-risk live
actions behind explicit human approval. Repository checks should run on every
pull request where possible; credentialed staging/production checks should run
on schedules or manual dispatch and fail closed when evidence secrets are
missing.

## Baseline metrics

Baseline commands were run from a clean dependency install on 2026-05-04.

| Area | Command | Result | Current metric / notes |
| --- | --- | --- | --- |
| Dependency install | `npm ci` | PASS | 1,663 packages installed; raw audit summary reported 9 vulnerabilities: 2 low, 4 moderate, 3 high. |
| Production aggregate | `npm run check:production:fast` | PASS | Preflight, runtime audit, secret hygiene, Nhost safety, API boundaries, auth safety, Hasura readiness, TS ratchet, PII logging, and lint ratchet all passed. |
| API boundary | `npm run check:api-boundaries` | PASS | 21 documented temporary exceptions, ratcheted at 21. |
| Raw lint | `npm run lint` | EXPECTED FAIL | 878 problems: 733 errors, 145 warnings. This remains controlled by the lint ratchet. |
| Lint ratchet | `npm run check:lint-ratchet` | PASS | Baseline/current: 733 errors, 145 warnings, 878 total problems. |
| Raw high audit | `npm audit --audit-level=high --json` | EXPECTED FAIL | 9 total findings: 2 low, 4 moderate, 3 high, 0 critical. High findings are in optional/dev build tooling chains. |
| Runtime audit | `npm run check:audit` via production fast | PASS | 0 unreviewed high/critical production runtime findings. |
| Frontend tests | `npm run test -- --run` | PASS | 35 files / 145 tests passed. |
| TypeScript | `npm run typecheck` | PASS | `tsc --noEmit -p tsconfig.typecheck.json` passed. |
| TypeScript ratchet | `npm run check:ts-ratchet` via production fast | PASS | Current: 219 JS, 475 JSX, 335 TS, 78 TSX, 507 `any`, 0 `ts-ignore`, 0 `ts-expect-error`. |
| Build | `npm run build` | PASS | Vite/PWA build completed. |
| Bundle size | `npm run check:size` | PASS | 595.31 kB total brotli, 22.06 kB initial, 213.67 kB largest chunk. Caps: 596 / 22.2 / 214 kB. |

## Current quality gates

| Gate | Existing command / workflow | Current status | Automation action |
| --- | --- | --- | --- |
| Production-fast repository safety | `npm run check:production:fast` | PASS | Keep as required CI gate. |
| Runtime audit policy | `scripts/check-audit.mjs`, `config/audit-exceptions.json` | PASS | Strengthen exception validation and artifact reporting. |
| Nhost config safety | `npm run check:nhost-config-safety` | PASS | Reuse in environment verification and protected CI. |
| API boundary ratchet | `npm run check:api-boundaries` | PASS with 0 exceptions | Preserve zero-exception cap; document any future exception with owner/deadline before changing the checker. |
| Lint ratchet | `npm run check:lint-ratchet` | PASS | Preserve ratchet while raw lint debt burns down. |
| TS ratchet/typecheck | `npm run check:ts-ratchet`, `npm run typecheck` | PASS | Preserve in CI and final readiness checks. |
| Bundle size | `npm run build && npm run check:size` | PASS | Preserve in CI and visual/preview workflows. |
| Unit/smoke/a11y | Vitest/Jest/Playwright workflows | PASS in previous readiness docs | Extend with role and Gate proof reports. |
| Hasura permission smoke | scheduled/live workflows | Exists | Integrate with environment verification and reports. |

## Gate 2/3/4 readiness status

| Gate area | Repository status | Remaining evidence requirement | Automation target |
| --- | --- | --- | --- |
| Gate 2 directory/import/identity | Directory pages, adapters, Nhost functions, and deterministic identity mapping tests exist. | Staging/live import preview, approval/rejection reason capture, conflict queue review. | Add Playwright Gate 2 proof specs and CI report artifacts. |
| Gate 3 messaging/digests/office hours/assignments | Messaging, digest, office-hours frontend/domain v0, and assignments routes exist. | Retry/idempotency evidence, digest recovery, live office-hours persistence/notification proof, assignments sync dry-run/live proof. | Add Playwright Gate 3 proof specs, synthetic checks, and human-review-required reports. |
| Gate 4 admin sync/analytics/command center | Admin dashboards, integration health, analytics, execution board, and command center surfaces exist. | Live source reconciliation, sync-now evidence, escalation/approval proof. | Add Playwright Gate 4 proof specs and report artifacts. |

## Manual operational work that remains human-gated

The manual work register remains authoritative for live production readiness.
Automation added by this effort should reduce collection time, but the following
items still require provider access, live credentials, or accountable human
approval before broad production launch:

1. Verify real staging/production Nhost and Hasura metadata/RBAC settings.
2. Rotate exposed OAuth and other high-risk secrets through provider consoles or secure APIs.
3. Execute live role smoke for Parent, Teacher, Partner, Admin, and Ops users.
4. Complete backup/restore and rollback drills against approved staging/production targets.
5. Verify Sentry release/redaction/alert routing and on-call receipt.
6. Verify DNS/TLS, storage bucket policies, email/auth templates, rate limits, and support/on-call readiness.
7. Complete legal/privacy/COPPA/FERPA and AI vendor/data-processing reviews.

## Automation roadmap

| Phase | Automation | Primary artifacts | Approval behavior |
| --- | --- | --- | --- |
| B | Renovate plus dependency/security scans | `renovate.json`, dependency security workflow, audit reports | Safe dev patch automerge only after checks; runtime/security/major updates require review. |
| C | Visual regression | Storybook artifact and Chromatic/Percy workflow | PR diffs require visual approval when token is configured. |
| D | Collaboration and previews | CODEOWNERS, preview workflow, process docs | Code owners and high-risk evidence reviewers required. |
| E | Schema/metadata validation | Disposable DB migration check, metadata validation, GraphQL type guard | Protected runs fail closed when schema credentials are required but missing. |
| F | Environment verification and secret rotation | JSON/Markdown environment reports, approval-gated rotation workflow | Rotation defaults to dry run; execution requires protected environment approval. |
| G | Role smoke and Gate proofs | Playwright HTML reports and Gate proof summaries | High-risk proof reports require human review before feature enablement. |
| H | Backup/restore and rollback | Drill reports, schema/row-count comparison, rollback dry-run summary | Production target requires protected environment approval and explicit input. |
| I | Synthetic monitoring and alerting | Scheduled Playwright/synthetic reports and Sentry/alert evidence | Alert verification requires explicit test flag and provider credentials. |
| J | Compliance and AI governance | Secret/PII/gitleaks scans, governance tests, compliance report | New secret/PII/governance failures block CI. |
| K | Final readout | Updated readiness docs and final automation matrix | Remaining manual tasks stay listed until evidence is attached. |

## Automations implemented in this pass

| Phase | Repository artifact | Trigger / command | Evidence produced |
| --- | --- | --- | --- |
| B Dependency/security | `renovate.json`, `.github/workflows/dependency-security.yml`, hardened `scripts/check-audit.mjs` | Renovate, PR/push/schedule security workflow, `npm run check:audit` | audit policy JSON summary and workflow logs; malformed/expired high/critical exceptions fail. |
| C Visual regression | `.github/workflows/visual-regression.yml`, `docs/testing/visual-regression.md` | PR/push/manual Storybook build and Chromatic upload when token exists | `storybook-static` artifact; Chromatic diff approval gate when configured. |
| D Collaboration | `.github/CODEOWNERS`, `.github/workflows/preview-environment.yml`, `docs/process/collaboration.md` | PR preview workflow | preview summary artifact; Vercel/Netlify deploy when provider secrets exist. |
| E Schema/metadata | `.github/workflows/schema-and-metadata.yml`, `scripts/ops/validate-schema-metadata.mjs`, `codegen.yml`, `docs/ci/schema-and-metadata.md` | PR/push/manual/scheduled and `npm run check:schema-metadata` | JSON/Markdown schema-metadata report; optional DB and GraphQL typegen proof. |
| F Environment/secrets | `.github/workflows/environment-verification.yml`, `.github/workflows/secret-rotation.yml`, `scripts/ops/env-verify.mjs`, `scripts/ops/secret-rotation.mjs` | nightly/manual and dry-run commands | redacted environment and rotation reports; execution requires protected GitHub environment approval. |
| G Role/Gate proofs | `.github/workflows/role-smoke-gate-proofs.yml`, `tests/e2e/role-smoke.spec.ts`, `tests/e2e/gate*.spec.ts`, `scripts/ops/gate-proof-report.mjs` | PR/manual and `npm run e2e:roles`, `npm run e2e:gates` | Playwright report plus Gate 2/3/4 Markdown review packet. |
| H Backup/rollback | `.github/workflows/backup-restore-rollback.yml`, `scripts/ops/backup-restore-drill.mjs`, `scripts/ops/rollback-drill.mjs` | weekly/manual dry-run or approved execution | schema/row-count comparison report; rollback smoke checklist/report. |
| I Synthetic monitoring | `.github/workflows/synthetic-monitoring.yml`, `tests/e2e/synthetic-monitor.spec.ts`, `scripts/ops/synthetic-monitor.mjs`, `/api/healthz` | 15-minute schedule/manual | synthetic monitoring JSON/Markdown report; optional Sentry alert verification. |
| J Compliance/AI | `.github/workflows/compliance-ai-governance.yml`, `scripts/ops/compliance-report.mjs`, `.gitleaks.toml` | PR/push/schedule/manual and `npm run ops:compliance-report` | compliance report covering secret hygiene, PII logging, gitleaks, and AI governance tests. |

## Reporting expectations

Every new operational script should emit:

- a human-readable Markdown summary for workflow logs/artifacts,
- machine-readable JSON for future dashboards,
- redacted configuration details only,
- explicit pass/fail/skip status,
- missing-secret notices that distinguish PR-safe skips from protected-context failures,
- evidence checklist links for any manual step that cannot be completed by automation.

## Success criteria

This automation pass is complete when:

- low-risk repository checks run automatically on PRs — **complete**,
- credentialed operational checks can run nightly or on demand — **complete, pending repository secrets for live environments**,
- high-risk live mutations cannot execute without explicit human approval — **complete via protected environment workflows and explicit `--execute`/approval inputs**,
- role/Gate proof reports are generated in CI — **complete**,
- backup/restore, rollback, synthetic monitoring, and compliance workflows produce evidence artifacts — **complete**,
- readiness docs identify all remaining manual evidence with owner placeholders and target dates — **complete; live signoff remains external/manual**.
