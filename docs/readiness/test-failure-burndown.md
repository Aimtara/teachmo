# Test Failure Burn-down

Generated: 2026-05-03

## Current status

| Command | Baseline status | Failure category | Planned resolution |
| --- | --- | --- | --- |
| `npm run test:backend` | PASS: 30 suites / 186 tests | None | Preserve root backend Jest strategy. |
| `cd backend && npm test` | FAIL: 15 failed suites / 4 failed tests in backend-local Jest | Backend package Jest config issue | Align backend package script with root Jest config. |
| `npm run test -- --run` | FAIL: 25 failed files / 32 failed tests | Vitest discovery + mock-shape + stale expectations | Exclude wrong-runner tests first, then fix remaining unit tests. |
| `npm run test:smoke` | PASS: 5 files / 15 tests | None | Keep green throughout. |

## Backend package Jest

Root backend Jest is the known-good configuration. Package-local Jest currently uses a divergent ESM config:

- `backend/package.json` runs `NODE_OPTIONS=--experimental-vm-modules jest --config jest.config.js --runInBand`.
- `backend/jest.config.js` has no Babel transform and package-local root semantics.
- Failures include `ReferenceError: jest is not defined` in ESM tests, bad feature flag root paths, and `backend/sample.test.js` being a Node `node:test` file discovered by Jest.

Owner placeholder: Backend Platform  
Target date placeholder: 2026-05-10

## Full Vitest failure categories

| Category | Representative files | Count / impact | Resolution |
| --- | --- | --- | --- |
| Unwanted nested dependency discovery | `nhost/functions/node_modules/zod/**`, `pg-protocol/**` | Multiple failed files / many irrelevant passed dependency tests | Exclude all nested `node_modules` trees. |
| Wrong runner: Playwright | `tests/e2e/*.spec.ts` | 9 failed files | Exclude from Vitest; keep covered by Playwright command. |
| Wrong runner: backend/Nhost Jest | `nhost/functions/__tests__/sis-roster-import.test.js`, `src/__tests__/backend/permissions.test.js` | 20 failures | Keep under backend/Jest validation, not UI Vitest. |
| Legacy/spec harness discovery | `src/components/testing/specs/TeacherClasses.test.jsx` | 1 failed file | Exclude legacy component test harness from full Vitest. |
| Syntax blocker | `src/pages/__tests__/OAuth2Consent.a11y.test.jsx` | Parse failure | Repair malformed test code. |
| Mock shape | `SurfaceBoundary`, `FounderDashboard`, `AITransparency`, `auditLog` tests | Several unit failures | Convert to reliable Vitest spies/mocks. |
| Stale expectation candidates | `AuthGuard`, `websocket`, `auth` tests | 3 failures | Inspect implementation and update test or source accordingly. |

## Validation log

| Timestamp | Command | Result | Notes |
| --- | --- | --- | --- |
| 2026-05-03 baseline | `npm run test:backend` | PASS | 30 suites / 186 tests. |
| 2026-05-03 baseline | `cd backend && npm test` | FAIL | 15 failed suites; divergent config. |
| 2026-05-03 baseline | `npm run test -- --run` | FAIL | 25 failed files / 32 failed tests. |
| 2026-05-03 baseline | `npm run test:smoke` | PASS | 5 files / 15 tests. |
