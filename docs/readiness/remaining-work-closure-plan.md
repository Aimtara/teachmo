# Remaining Work Closure Plan

Generated: 2026-05-03  
Baseline commit: `dad6ee8`

## Current verdict

Teachmo remains a **controlled pilot candidate only after manual environment evidence is completed**. Automated gates are stronger than the historic baseline, but the repository still has ratcheted lint debt, documented dev/optional dependency audit findings, zero temporary API-boundary exceptions, and live-environment readiness tasks that cannot be truthfully completed from local code alone.

## Phase 1 baseline

| Area | Command / source | Result | Evidence / notes |
| --- | --- | --- | --- |
| Git state | `git status --short` | PASS | Clean at baseline. |
| Commit | `git rev-parse --short HEAD` | `dad6ee8` | Baseline for this closure. |
| Runtime | `node --version`; `npm --version` | PASS | Node `v20.20.2`, npm `10.8.2`. |
| Install | `npm ci` | PASS | 1,747 packages installed; npm reports 25 audit findings. |
| Full lint | `npm run lint` | FAIL / RATCHETED | 1,006 problems: 849 errors, 157 warnings. |
| Lint ratchet | `npm run check:lint-ratchet` | PASS | Current debt did not increase. |
| Vitest | `npm run test -- --run` | PASS | 34 files / 127 tests. |
| Smoke tests | `npm run test:smoke` | PASS | 5 files / 15 tests. |
| Backend Jest | `npm run test:backend` | PASS | 30 suites / 186 tests. |
| Backend package Jest | `cd backend && npm test` | PASS | 30 suites / 186 tests. |
| Typecheck | `npm run typecheck` | PASS | TypeScript typecheck green. |
| Build | `npm run build` | PASS | Vite/PWA production build succeeds. |
| Bundle size | `npm run check:size` | PASS / RATCHETED | Total 601.28 kB brotli; initial 22.28 kB; largest chunk 224.63 kB. |
| Dependency audit | `npm audit --audit-level=high --json` | FAIL | 25 vulnerabilities: 12 high, 11 moderate, 2 low. |
| API boundaries | `npm run check:api-boundaries` | PASS / EXCEPTIONS | Current refreshed state: 17 documented temporary exceptions after the May 4 refresh and this AI/admin adapter burn-down. |
| Fast production checks | `npm run check:production:fast` | PASS | Includes secret hygiene, Nhost safety, API boundaries, TS/PII/lint ratchets. |
| Launch aggregate | `npm run check:launch` | PASS | Fast checks, smoke, build, size ratchet. |

## Closure workstream status

| Workstream | Baseline | Target for this closure | Launch impact |
| --- | --- | --- | --- |
| Dependency security | 12 high audit vulnerabilities | Fix safe chains; add `check:audit`; document expiring exceptions only where upstream/breaking risk blocks safe fix. | Broad launch blocker if unreviewed high findings remain. |
| Lint | 1,006 ratcheted problems | Eliminate parser and `no-undef` where feasible; reduce unused vars; tighten ratchet. | Controlled by ratchet; full green preferred. |
| API boundaries | 40 temporary exceptions; reduced to 37 after the first closure, 21 after the May 4 refresh, and 0 after completing admin analytics/notification/observability/partner/SIS adapter extraction. | Maintain zero temporary exceptions. | Regression blocker if any direct UI backend call returns. |
| Bundle | 601.28 kB total brotli | Reduce safely and enforce hybrid app-shell/per-chunk/total ratchet. | Requires owner approval if old 500 kB aggregate is not used. |
| Manual readiness | 26 manual items | Convert to executable evidence templates and launch decision matrix. | Broad launch blocker until live evidence exists. |
| Browser QA | Not rerun at phase 1 | Run Playwright/Jest a11y if feasible; document blockers. | Required before broad launch; recommended before pilot. |
| Gate 2 | Directory/import/approval partial; E13 missing | Implement deterministic identity mapping v0 or mark launch blocker. | Pilot blocker if E13 not implemented or explicitly out of scope. |
| Gate 3 | Messaging/digests/assignments partial; E16 placeholder | Implement/gate office hours and reliability slices. | Pilot blocker if office hours is promised. |
| Gate 4 | Admin/analytics/command center partial | Adapter extraction, validation docs, support playbook, live-proof templates. | Broad launch blocker until live proof. |

## TypeScript migration ratchet note

The closure intentionally renamed thirteen parser-blocked admin `.jsx` files to
`.tsx` and added typed office-hours/domain modules. This increased tracked
TypeScript file and `any` counts while reducing `.jsx` count and eliminating
parser/`no-undef` lint debt. `docs/readiness/ts-ratchet-baseline.json` was
updated to the reviewed post-rename inventory:

- `js`: 219
- `jsx`: 475
- `ts`: 319
- `tsx`: 78
- `any`: 512

No `@ts-ignore` or `@ts-expect-error` exceptions were introduced. Future work
should reduce `any` in the renamed admin pages and Nhost function shared helpers.

## Dependency audit baseline summary

High-severity or notable findings:

- `vite` direct: dev-server file read/path traversal advisories.
- `lodash` direct/transitive: template code injection and prototype pollution advisories.
- `bundlesize` direct via `github-build`/`axios`: high SSRF/DoS chain; obsolete relative to custom size ratchet.
- `vite-plugin-pwa` / `workbox-build` / `@rollup/plugin-terser` / `serialize-javascript`: build-time high advisory chain.
- `path-to-regexp` transitive via Express 5 router: DoS advisory.
- `@xmldom/xmldom` transitive: XML injection/DoS advisories.
- `react-quill` / `quill`: moderate XSS chain and appears unused in source.
- `nodemailer`: moderate/low SMTP command injection advisories.

## Lint baseline summary

| Rule bucket | Count | Closure priority |
| --- | ---: | --- |
| `no-unused-vars` | 668 | High but mechanical; fix touched files and low-risk batches. |
| `react-hooks/exhaustive-deps` | 83 | Behavior-sensitive; only fix with characterization. |
| `react-refresh/only-export-components` | 68 | Medium; split exports where safe. |
| `@typescript-eslint/no-explicit-any` | 53 | Medium; fix obvious touched code. |
| `no-undef` | 33 | P0; eliminate or justify. |
| parser / ruleId-null bucket | 25 | P0; eliminate actual parser blockers and stale disable directives. |

## API-boundary baseline summary

`npm run check:api-boundaries` passes by documenting 17 temporary exceptions. Highest-risk remaining groups are:

- Admin/ops pages and widgets.
- AI governance and AI prompt management.
- Directory admin.
- Compliance banner.
- Integration connection widgets.
- Partner pages.
- Legacy hooks and discover feed.

## Bundle baseline summary

| Metric | Baseline |
| --- | ---: |
| Total brotli JS | 601.28 kB |
| Initial app-shell brotli | 22.28 kB |
| Largest JS chunk brotli | 224.63 kB |
| Current total cap | 602 kB |
| Current app-shell cap | 24 kB |
| Current largest-chunk cap | 230 kB |

Policy direction for this closure: **hybrid ratchet** unless safe dependency removal and route splitting bring total brotli below 500 kB without removing features.

## Current launch classification

| Launch mode | Classification | Required evidence before promotion |
| --- | --- | --- |
| Broad production | NO-GO | Audit review, high-risk API exception burn-down, browser QA, role smoke, Nhost/Hasura/Sentry/storage/DNS/OAuth/legal evidence. |
| Controlled pilot | CONDITIONAL | Manual environment verification, OAuth secret rotation evidence, role smoke, backup/rollback proof, explicit gate-scope decision for E13/E16. |
| Internal demo/dev | GO with ratchets | Existing automated launch checks pass. |

## Phase 2 dependency-security update

Phase 2 materially reduced audit exposure without removing product functionality.

| Metric | Before | After | Notes |
| --- | ---: | ---: | --- |
| Root full npm audit findings | 25 total / 12 high | 6 total / 0 high | Remaining findings are lower-severity dev/optional chains documented in `config/audit-exceptions.json`. |
| Root launch/runtime audit findings | 25 total / 12 high | 0 high/critical | `npm run check:audit` audits production runtime scope (`--omit=dev --omit=optional`) and passed. |
| Backend package audit | 7 findings after lodash removal | 0 | `cd backend && npm audit --audit-level=high` passed after backend dependency updates. |
| Nhost functions audit | 2 findings after nodemailer update | 0 | `cd nhost/functions && npm audit fix && npm audit --audit-level=high` passed. |

Dependency actions completed:

- Removed obsolete root `bundlesize` and unused `react-quill`.
- Removed direct root/backend `lodash` usage by replacing `isEqual` and `debounce` with local helpers.
- Upgraded direct vulnerable packages including Vite 6 patch line, DOMPurify, PostCSS, Nodemailer, backend Nodemon, Nhost Nodemailer, Vitest coverage/runtime, and size-limit tooling.
- Added targeted npm overrides for production transitive `@xmldom/xmldom`, `path-to-regexp`, `picomatch`, `brace-expansion`, and `lodash`.
- Added `npm run check:audit` plus `config/audit-exceptions.json` for documented dev/optional residual findings.

Validation:

- `npm run check:audit`: PASS.
- `cd backend && npm audit --audit-level=high`: PASS.
- `cd nhost/functions && npm audit --audit-level=high`: PASS.
- `npm run typecheck`: PASS.
- `npm run test:smoke`: PASS.
- `npm run test:backend`: PASS.
- `cd backend && npm test`: PASS.
- `npm run build && npm run check:size`: PASS.

## May 4 closure update

This execution pass completed a further repository-controlled burn-down while
continuing to keep live-environment tasks separate from automated claims.

| Area | Before this pass | After May 4 pass | Evidence |
| --- | ---: | ---: | --- |
| API-boundary exceptions | 37 | 0 | `npm run check:api-boundaries`; ratchet cap now fails above 0. |
| Runtime high/critical vulnerabilities | 0 | 0 | `npm run check:audit`; `npm audit --audit-level=high --omit=dev --omit=optional`. |
| Full raw audit findings | 10 total / 4 high | 6 total / 0 high | `serialize-javascript@7.0.5` override removes the PWA/workbox high chain; remaining findings are lower severity. |
| Lint ratchet | 940 problems | 936 problems | Parser and `no-undef` remain 0; `@typescript-eslint/no-explicit-any` is down to 111. |
| TypeScript `any` count | 512 baseline | 507 | Domain extractions improved typed surface while adding TS adapter files. |
| Bundle size ratchet | 602/24/225 kB | 596/23/214 kB | Current build: 595.09 kB total, 22.50 kB initial, 213.67 kB largest chunk. |
| Unit/smoke/backend tests | PASS | PASS | Full Vitest 35/145, smoke 5/15, backend Jest 31/190. |
| Browser E2E | FAIL: 2 pass / 6 fail / 4 skipped | PASS scoped smoke: 7 pass / 5 skipped | Login axe, calendar, teacher, keyboard, admin, and ops route guard now pass. |
| Unit a11y command | FAIL under Jest runner | PASS under Vitest runner | `npm run test:a11y`: 5 files / 22 tests. |

Additional work completed:

- Extracted AI transparency, school-directory admin, partner incentives,
  partner submissions, execution-board fallback, admin audit-log, AI policy
  simulation, discover recommendations, AI prompt library, tenant hooks, and
  selected admin school/user/system/domain calls behind domain adapters.
- Added scoped Playwright feature flags for gated browser smoke without enabling
  gated features globally.
- Hardened the dev/E2E route-guard path so mock E2E roles are evaluated instead
  of bypassing authorization checks.
- Added missing live-evidence templates for directory identity conflicts,
  office-hours verification, messaging/digest retry proof, assignments sync, and
  admin sync/dashboard validation.

## Current final classification

| Launch mode | Classification | Required evidence before promotion |
| --- | --- | --- |
| Broad production | NO-GO | Critical/high manual evidence remains incomplete: live Nhost/Hasura/Sentry/storage/DNS/OAuth/legal/support/backup/rollback/role-smoke and Gate 2/3/4 live proofs. |
| Controlled pilot | CONDITIONAL | Automated gates are materially stronger and browser smoke is green; pilot still requires OAuth rotation plus staging Nhost/Hasura/Sentry, role smoke, backup/rollback, and scoped Gate 2/3/4 acceptance. |
| Internal demo/dev | GO with ratchets | Automated launch/production checks, browser smoke, and a11y command pass with documented manual caveats. |

## May 5 closure sprint refresh

Verified baseline at `2bd288e` on branch `cursor/security-gates-closure-e013`:
Node `v20.20.2`, npm `10.8.2`, `npm ci` PASS, `npm run check:production:fast` PASS, and API-boundary exceptions remain **0**.

| Area | May 4 state | Verified May 5 state | Action |
| --- | ---: | ---: | --- |
| Full root audit | 9 total / 3 high after install | 6 total / 0 high / 0 critical | Added a targeted `serialize-javascript@7.0.5` override for the optional PWA Workbox chain and validated full high audit. |
| Runtime audit | 0 high/critical | 0 high/critical | `npm run check:audit` still passes. |
| API-boundary exceptions | 0 | 0 | Removed stale checker allowlist so docs and ratchet match. |
| Gate 2 import proof | v0 | Stronger v0 | SIS import now supports dry-run identity preview with no roster mutation; Jest covers exact match, scoped email, guardian relationship, conflict/manual review, invalid row, and duplicate row paths through the identity mapper/import preview. |
| Gate 3 reliability | Docs/manual proof path | Stronger repository proof | Added messaging retry/backoff/idempotency policy tests, assignments dry-run validation, and office-hours reschedule/permission/timezone coverage. |
| Gate 4 command center | v0 route/page | Permission-aware v0 | Express route now requires authenticated admin role; backend tests verify unauthenticated and non-admin denial. |
| PII logging | PASS | PASS with stricter detector | Message body and preview telemetry log patterns are now flagged; send-message analytics no longer stores raw message preview. |

Remaining classification is unchanged: **NO-GO for broad production** until live credentials, legal/privacy/artificial-intelligence governance, role smoke, and Gate 2–4 live evidence are attached. Controlled pilot remains conditional on the manual evidence register.

