# Remaining Work Closure Plan

Generated: 2026-05-03  
Baseline commit: `dad6ee8`

## Current verdict

Teachmo remains a **controlled pilot candidate only after manual environment evidence is completed**. Automated gates are stronger than the historic baseline, but the repository still has ratcheted lint debt, high-severity dependency audit findings, 40 temporary API-boundary exceptions, and live-environment readiness tasks that cannot be truthfully completed from local code alone.

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
| API boundaries | `npm run check:api-boundaries` | PASS / EXCEPTIONS | 40 documented temporary exceptions. |
| Fast production checks | `npm run check:production:fast` | PASS | Includes secret hygiene, Nhost safety, API boundaries, TS/PII/lint ratchets. |
| Launch aggregate | `npm run check:launch` | PASS | Fast checks, smoke, build, size ratchet. |

## Closure workstream status

| Workstream | Baseline | Target for this closure | Launch impact |
| --- | --- | --- | --- |
| Dependency security | 12 high audit vulnerabilities | Fix safe chains; add `check:audit`; document expiring exceptions only where upstream/breaking risk blocks safe fix. | Broad launch blocker if unreviewed high findings remain. |
| Lint | 1,006 ratcheted problems | Eliminate parser and `no-undef` where feasible; reduce unused vars; tighten ratchet. | Controlled by ratchet; full green preferred. |
| API boundaries | 40 temporary exceptions | Extract high-risk admin/AI/directory/integration calls behind adapters; reduce allowlist. | Broad launch blocker if high-risk direct UI calls remain unowned. |
| Bundle | 601.28 kB total brotli | Reduce safely and enforce hybrid app-shell/per-chunk/total ratchet. | Requires owner approval if old 500 kB aggregate is not used. |
| Manual readiness | 26 manual items | Convert to executable evidence templates and launch decision matrix. | Broad launch blocker until live evidence exists. |
| Browser QA | Not rerun at phase 1 | Run Playwright/Jest a11y if feasible; document blockers. | Required before broad launch; recommended before pilot. |
| Gate 2 | Directory/import/approval partial; E13 missing | Implement deterministic identity mapping v0 or mark launch blocker. | Pilot blocker if E13 not implemented or explicitly out of scope. |
| Gate 3 | Messaging/digests/assignments partial; E16 placeholder | Implement/gate office hours and reliability slices. | Pilot blocker if office hours is promised. |
| Gate 4 | Admin/analytics/command center partial | Adapter extraction, validation docs, support playbook, live-proof templates. | Broad launch blocker until live proof. |

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

`npm run check:api-boundaries` passes by documenting 40 temporary exceptions. Highest-risk remaining groups are:

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
| Current total cap | 614 kB |
| Current app-shell cap | 28 kB |
| Current largest-chunk cap | 270 kB |

Policy direction for this closure: **hybrid ratchet** unless safe dependency removal and route splitting bring total brotli below 500 kB without removing features.

## Current launch classification

| Launch mode | Classification | Required evidence before promotion |
| --- | --- | --- |
| Broad production | NO-GO | Audit review, high-risk API exception burn-down, browser QA, role smoke, Nhost/Hasura/Sentry/storage/DNS/OAuth/legal evidence. |
| Controlled pilot | CONDITIONAL | Manual environment verification, OAuth secret rotation evidence, role smoke, backup/rollback proof, explicit gate-scope decision for E13/E16. |
| Internal demo/dev | GO with ratchets | Existing automated launch checks pass. |

