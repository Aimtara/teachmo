# Dependency Security Burn-down

Generated: 2026-05-03

## Summary

Dependency security is now governed by a launch audit gate:

- `npm run check:audit`
- Scope: production runtime dependencies only (`npm audit --omit=dev --omit=optional --audit-level=high --json`)
- Policy: fail on any high/critical production runtime advisory that is not documented in `config/audit-exceptions.json`.

The full raw audit still reports dev/optional build-tool advisories, primarily from Storybook and the PWA/workbox build chain. Those are documented below and remain non-runtime follow-up items; they do not block the production runtime audit gate.

## Before vs after

| Metric | Baseline | After Phase 2 |
| --- | ---: | ---: |
| Full `npm audit --audit-level=high` total vulnerabilities | 25 | 10 |
| Full audit high vulnerabilities | 12 | 4 |
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

## Remaining documented non-runtime advisories

| Package / chain | Severity | Exposure | Reason not blocking launch | Owner placeholder | Target / expiration |
| --- | --- | --- | --- | --- | --- |
| `vite-plugin-pwa` / `workbox-build` / `@rollup/plugin-terser` / `serialize-javascript` | High in full raw audit | Optional build-time PWA generation chain; not installed in production runtime audit scope. | npm audit recommends `vite-plugin-pwa@0.19.8`, a downgrade from current 1.2.0. Current build and PWA generation pass; downgrade would be higher functional risk than documenting the build-only exposure. | Frontend Platform | 2026-06-30 |
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

