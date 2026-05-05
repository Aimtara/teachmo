# Dependency Security Burn-down

Generated: 2026-05-05

## Summary

Dependency security is now governed by a launch audit gate:

- `npm run check:audit`
- Scope: production runtime dependencies only (`npm audit --omit=dev --omit=optional --audit-level=high --json`)
- Policy: fail on any high/critical production runtime advisory that is not documented in `config/audit-exceptions.json`.

The May 5 closure removed the remaining high full-audit finding by overriding the optional Workbox terser chain to `serialize-javascript@7.0.5`. Full raw audit still reports moderate/low dev/optional findings in Storybook, Workbox `ajv`, and `@flydotio/dockerfile`; those are documented below and remain non-runtime follow-up items.

## Before vs after

| Metric | Baseline | After Phase 2 |
| --- | ---: | ---: |
| Full `npm audit --audit-level=high` total vulnerabilities | 25 | 6 |
| Full audit high vulnerabilities | 12 | 0 |
| Full audit moderate vulnerabilities | 11 | 4 |
| Full audit low vulnerabilities | 2 | 2 |
| Runtime audit high/critical vulnerabilities | 12 high in raw install | 0 |
| Backend package audit | 7 vulnerabilities after lodash removal | 0 |
| Nhost functions package audit | 2 vulnerabilities after nodemailer upgrade | 0 |

## Fixes completed

| Package / chain | Action | Exposure result |
| --- | --- | --- |
| `bundlesize` → `github-build` → `axios` | Removed obsolete `bundlesize`; current size gate is `scripts/check-size-ratchet.mjs`. | Eliminated high transitive `axios` chain from root audit. |
| `react-quill` → `quill` | Removed unused `react-quill`; source search showed no runtime imports. | Eliminated browser XSS-prone editor chain. |
| Direct `lodash` usage | Replaced backend deep equality and frontend debounce with local helpers; removed root/backend direct dependency. | Eliminated direct app/backend lodash dependency. |
| `vite` | Updated to Vite 6.4.2, the latest compatible line for Storybook 8/Vite PWA 1.2. | Cleared direct Vite advisory while preserving build compatibility. |
| `dompurify`, `postcss`, `nodemailer` | Updated direct runtime packages. | Cleared direct runtime advisories. |
| `@xmldom/xmldom`, `path-to-regexp`, `picomatch`, `brace-expansion`, `lodash` | Added root npm overrides to patched/current packages where upstream ranges lagged audit advisories. | Runtime audit now passes with zero high/critical findings. |
| Backend package | Removed `lodash`, upgraded `nodemon`, ran `npm update`. | `cd backend && npm audit --audit-level=high` passes. |
| Nhost functions package | Upgraded `nodemailer`, applied `npm audit fix`. | `cd nhost/functions && npm audit --audit-level=high` passes. |
| `vite-plugin-pwa` / `workbox-build` / `@rollup/plugin-terser` / `serialize-javascript` | Added root override to `serialize-javascript@7.0.5`. | Full raw root audit now has zero high/critical findings. |

## Remaining documented non-runtime advisories

| Package / chain | Severity | Exposure | Reason not blocking launch | Owner placeholder | Target / expiration |
| --- | --- | --- | --- | --- | --- |
| `vite-plugin-pwa` / `workbox-build` / `ajv` | Moderate in full raw audit | Optional build-time PWA generation chain; not installed in production runtime audit scope. | High `serialize-javascript` exposure is patched by override; remaining `ajv` finding requires upstream Workbox patch or risky build-chain downgrade. | Frontend Platform | 2026-06-30 |
| Storybook 8 `@storybook/addon-essentials` / `@storybook/addon-actions` / nested `uuid` | Moderate in full raw audit | Dev-only Storybook tooling; not production runtime. | npm audit recommends a major downgrade path that is incompatible with current Storybook 8 setup. Runtime audit excludes dev dependencies. | Frontend Platform | 2026-06-30 |
| `@flydotio/dockerfile` / `diff` | Low in full raw audit | Dev/release tooling only. | Low severity and non-runtime; track with regular dev-tool updates. | DevOps Platform | 2026-06-30 |
| `ajv` under workbox | Moderate in full raw audit | Optional build-time PWA generation chain. | Covered by PWA build-chain exception above. | Frontend Platform | 2026-06-30 |

## Commands run

| Command | Result |
| --- | --- |
| `npm run check:audit` | PASS |
| `npm audit --audit-level=high --omit=dev --omit=optional` | PASS |
| `cd backend && npm audit --audit-level=high` | PASS |
| `cd nhost/functions && npm audit --audit-level=high` | PASS |
| `npm run typecheck` | PASS |
| `npm run test:backend` | PASS |
| `cd backend && npm test` | PASS |
| `npm run test:smoke` | PASS |
| `npm run build && npm run check:size` | PASS |

## May 5 security closure update

| Command | Result | Notes |
| --- | --- | --- |
| `npm audit --audit-level=high` | PASS | Full raw audit is 6 total: 0 high, 0 critical, 4 moderate, 2 low. |
| `npm run check:audit` | PASS | Production runtime scope remains 0 high/critical. |
| `npm run check:secret-hygiene` | PASS | Secret scanner remains green after dependency/config changes. |
| `npm run check:pii-logging` | PASS | Message body/preview logging is covered by the checker and tests. |

Audit exceptions now require `reviewCommand` in addition to package, advisory list, severity, exposure, reason, mitigation, owner, and expiry.

## May 4 final verification

The final closure run re-verified dependency posture after API-boundary and
ratchet changes:

| Command | Result | Notes |
| --- | --- | --- |
| `npm run check:audit` | PASS | Production runtime scope has 0 high/critical findings. |
| `npm audit --audit-level=high` | PASS after May 5 override | Full raw audit high/critical findings are 0; 6 lower-severity non-runtime findings remain documented. |
| `npm run check:secret-hygiene` | PASS | No new tracked secret patterns detected. |
| `npm run check:nhost-config-safety` | PASS | Safe repo Nhost config remains enforced. |

## May 4 operational automation update

The operational automation pass added dependency/security automation on top of
the existing runtime audit gate:

- `renovate.json` groups safe dev-tool patch/minor updates and only enables
  automerge for patch-level development dependencies after required checks pass.
  Runtime, security, lockfile, and major updates still require human review.
- `.github/workflows/dependency-security.yml` runs root, backend, and Nhost
  function audits, dependency review, and the hardened audit policy.
- `scripts/check-audit.mjs` now validates that every exception contains
  package, advisory list, severity, exposure, reason, mitigation, owner, and a
  non-expired expiration date. It can also emit JSON summaries for CI artifacts.
- `scripts/check-audit.test.mjs` covers valid, malformed/expired, and
  unreviewed high/critical finding cases.

Latest local verification for this pass:

| Command | Result | Notes |
| --- | --- | --- |
| `node --test scripts/check-audit.test.mjs` | PASS | 3 audit-policy tests. |
| `npm run check:audit` | PASS | 0 unreviewed high/critical production runtime findings. |
| `npm run test:scripts` | PASS | 18 script tests after adding audit-policy coverage. |
| `npm run ops:compliance-report -- --output-dir artifacts/ops` | PASS | Secret hygiene, PII logging, AI governance tests passed; gitleaks skipped locally because CLI is not installed. |

