# API Boundary Exceptions

Generated: 2026-05-04

`npm run check:api-boundaries` currently passes with **14 documented temporary exceptions**, reduced from the May 2026 closure baseline of 37 by moving AI transparency, school directory admin, execution board fallback, partner incentives/submissions, audit-log viewer, AI policy simulation, personalized discover, AI prompt library, school requests, system health, tenant domains, admin impersonation, profile, tenant feature flag, tenant SSO, AI budget, AI cost forecast, AI governance, AI review, admin dashboard, and notification metrics/opt-out calls behind domain modules. The checker now ratchets the exception count at 14 and fails on any increase.

## Policy

- UI pages/components/hooks must call `src/domains/**`, `src/services/**`, or approved API adapters.
- UI must not call raw `fetch`, `graphqlRequest`, `apiClient.entity.*`, `compatClient`, platform entity maps, Base44, raw SDKs, or admin-secret paths.
- Exceptions must include owner, target removal date, reason, risk, and replacement domain.
- New exceptions are not allowed without updating the checker and this register.

## Exceptions remaining

| Risk | Area | Files/patterns | Owner placeholder | Target date placeholder | Planned replacement |
| --- | --- | --- | --- | --- | --- |
| High | Admin/ops | Remaining `src/pages/Admin*` raw `fetch`/`graphqlRequest` | Admin Platform | 2026-07-15 | Continue `src/domains/admin/**` service adapter extraction |

## Evidence

- `npm run check:api-boundaries` after reduction: pass, 14 temporary exceptions.
- `npm run typecheck`: pass.
- `npm run test:smoke`: pass.
- `npm run test -- --run`: pass, 35 files / 145 tests.
