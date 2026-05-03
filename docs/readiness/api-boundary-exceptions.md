# API Boundary Exceptions

Generated: 2026-05-03

`npm run check:api-boundaries` currently passes with **37 documented temporary exceptions**, reduced from the May 2026 closure baseline of 40 by moving CCPA location checks, integration connection actions, and admin integration health calls behind domain modules.

## Policy

- UI pages/components/hooks must call `src/domains/**`, `src/services/**`, or approved API adapters.
- UI must not call raw `fetch`, `graphqlRequest`, `apiClient.entity.*`, `compatClient`, platform entity maps, Base44, raw SDKs, or admin-secret paths.
- Exceptions must include owner, target removal date, reason, risk, and replacement domain.
- New exceptions are not allowed without updating the checker and this register.

## Exceptions remaining

| Risk | Area | Files/patterns | Owner placeholder | Target date placeholder | Planned replacement |
| --- | --- | --- | --- | --- | --- |
| High | Admin/ops | `src/pages/Admin*` raw `fetch`/`graphqlRequest`; `src/components/admin/**` | Admin Platform | 2026-07-15 | `src/domains/admin/**` and admin service adapters |
| High | AI governance | `src/pages/AIPromptLibrary.jsx`, `src/pages/AITransparency.jsx`, `src/components/ai/**` | AI Platform | 2026-07-15 | `src/domains/ai/**` with governance telemetry |
| High | Directory admin | `src/pages/SchoolDirectoryAdmin.jsx` | Directory Platform | 2026-07-15 | `src/domains/directory/**` |
| Medium | Partner | `src/pages/PartnerIncentives.jsx`, `src/pages/PartnerSubmissions.jsx` | Partner Platform | 2026-07-15 | `src/domains/partner/**` |
| Medium | Discover | `src/components/discover/PersonalizedDiscoverFeed.jsx` | Discover Platform | 2026-06-30 | `src/domains/discover/**` |
| Medium | Legacy hooks | `src/hooks/useMyProfile.ts`, tenant settings/SSO hooks | Frontend Platform | 2026-06-30 | Relocate to `src/domains/**` or `src/services/**` |
| Medium | Ops board | `src/pages/ExecutionBoard.jsx` fallback fetch | Ops Platform | 2026-07-15 | Expand `src/domains/executionBoard.ts` coverage |

## Evidence

- `npm run check:api-boundaries` after reduction: pass, 37 temporary exceptions.
- `npm run typecheck`: pass.
- `npm run test:smoke`: pass.
