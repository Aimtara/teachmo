# API Boundary Exceptions

Generated: 2026-05-04

`npm run check:api-boundaries` currently passes with **30 documented temporary exceptions**, reduced from the May 2026 closure baseline of 37 in this pass by moving AI transparency, school directory admin, execution board fallback, partner incentives/submissions, audit-log viewer, and AI policy simulation calls behind domain modules. The checker now ratchets the exception count at 30 and fails on any increase.

## Policy

- UI pages/components/hooks must call `src/domains/**`, `src/services/**`, or approved API adapters.
- UI must not call raw `fetch`, `graphqlRequest`, `apiClient.entity.*`, `compatClient`, platform entity maps, Base44, raw SDKs, or admin-secret paths.
- Exceptions must include owner, target removal date, reason, risk, and replacement domain.
- New exceptions are not allowed without updating the checker and this register.

## Exceptions remaining

| Risk | Area | Files/patterns | Owner placeholder | Target date placeholder | Planned replacement |
| --- | --- | --- | --- | --- | --- |
| High | Admin/ops | Remaining `src/pages/Admin*` raw `fetch`/`graphqlRequest` | Admin Platform | 2026-07-15 | Continue `src/domains/admin/**` service adapter extraction |
| High | AI governance | `src/pages/AIPromptLibrary.jsx`; remaining admin AI pages | AI Platform | 2026-07-15 | `src/domains/ai/**` with governance telemetry |
| Medium | Discover | `src/components/discover/PersonalizedDiscoverFeed.jsx` | Discover Platform | 2026-06-30 | `src/domains/discover/**` |
| Medium | Legacy hooks | `src/hooks/useMyProfile.ts`, tenant settings/SSO hooks | Frontend Platform | 2026-06-30 | Relocate to `src/domains/**` or `src/services/**` |

## Evidence

- `npm run check:api-boundaries` after reduction: pass, 30 temporary exceptions.
- `npm run typecheck`: pass.
- `npm run test:smoke`: pass.
- `npm run test -- --run src/pages/__tests__/AITransparency.a11y.test.jsx`: pass.
