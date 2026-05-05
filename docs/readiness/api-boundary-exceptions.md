# API Boundary Exceptions

Generated: 2026-05-04

`npm run check:api-boundaries` currently passes with **0 documented temporary exceptions**, reduced from the May 2026 closure baseline of 37 by moving all remaining admin, AI, partner, SIS, observability, notification, directory, discover, tenant, and integration UI transport calls behind domain modules. The checker now ratchets the exception count at 0 and fails on any new temporary exception.

## Policy

- UI pages/components/hooks must call `src/domains/**`, `src/services/**`, or approved API adapters.
- UI must not call raw `fetch`, `graphqlRequest`, `apiClient.entity.*`, `compatClient`, platform entity maps, Base44, raw SDKs, or admin-secret paths.
- Exceptions must include owner, target removal date, reason, risk, and replacement domain.
- New exceptions are not allowed without updating the checker and this register.

## Exceptions remaining

None. Temporary UI API-boundary exceptions are closed.

## Evidence

- `npm run check:api-boundaries` after reduction: pass, 0 temporary exceptions.
- `npm run typecheck`: pass.
- `npm run test:smoke`: pass.
- `npm run test -- --run`: pass, 35 files / 145 tests.
