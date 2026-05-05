# API Boundary Exceptions

Generated: 2026-05-05

`npm run check:api-boundaries` currently passes with **0 documented temporary exceptions**, reduced from the May 2026 closure baseline of 37 by moving all remaining admin, AI, partner, SIS, observability, notification, directory, discover, tenant, and integration UI transport calls behind domain modules. On May 5 the stale checker allowlist was removed so the zero-exception docs and script are aligned.

## Policy

- UI pages/components/hooks must call `src/domains/**`, `src/services/**`, or approved API adapters.
- UI must not call raw `fetch`, `graphqlRequest`, `apiClient.entity.*`, `compatClient`, platform entity maps, Base44, raw SDKs, or admin-secret paths.
- Exceptions must include owner, target removal date, reason, risk, and replacement domain.
- New exceptions are not allowed without updating the checker and this register.

## Exceptions remaining

None. Temporary UI API-boundary exceptions are closed.

## Evidence

- `npm run check:api-boundaries` after reduction: pass, 0 temporary exceptions.
- `scripts/check-api-boundaries.mjs` now has an empty `TEMPORARY_ALLOWLIST`; new raw UI transport calls fail as violations rather than documented exceptions.
- `npm run typecheck`: pass.
- `npm run test:smoke`: pass.
- `npm run test -- --run`: pass, 35 files / 145 tests.
