# TypeScript Migration Tracker

Generated: 2026-03-11T22:50:48.534Z

## Baseline totals (tracked files)

| Extension | Count |
| --- | ---: |
| .js | 218 |
| .jsx | 512 |
| .ts | 256 |
| .tsx | 35 |

## JS/TS inventory by top-level directory

| Directory | .js | .jsx | .ts | .tsx |
| --- | ---: | ---: | ---: | ---: |
| src | 33 | 511 | 148 | 35 |
| backend | 147 | 0 | 6 | 0 |
| nhost | 30 | 0 | 86 | 0 |
| (repo root) | 7 | 1 | 3 | 0 |
| public | 1 | 0 | 0 | 0 |
| .storybook | 0 | 0 | 2 | 0 |
| scripts | 0 | 0 | 1 | 0 |
| tests | 0 | 0 | 10 | 0 |

## Phase 0 ownership and sprint plan

| Directory | Owner | Risk level | Target sprint | Blocked by |
| --- | --- | --- | --- | --- |
| src | Frontend Platform | High | Sprint 2-6 | Shared type contracts + slice DRIs |
| backend | Backend Platform | High | Sprint 4-8 | Typed request/response + middleware context contracts |
| nhost | Data Platform | Medium | Sprint 5-8 | Schema-adjacent TS utility ownership alignment |
| (repo root) | Developer Experience | Medium | Sprint 6-10 | Config-level JS exception decisions |
| public | Frontend Platform | Low | Sprint 8-10 | Generated/static file exemption review |
| .storybook | Design System | Low | Sprint 6-9 | Storybook TS config parity checks |
| scripts | Developer Experience | Low | Sprint 6-9 | Tooling compatibility review |
| tests | QA & Reliability | Medium | Sprint 6-9 | Typed fixtures + helper migration sequencing |

## Temporary JavaScript exception register (initial)

| Path/pattern | Owner | Reason | Risk impact | Target removal date | Tracking issue |
| --- | --- | --- | --- | --- | --- |
| `src/**/*.jsx` and `src/**/*.js` | Frontend Platform | Legacy React/UI slices pending vertical migration sequencing. | High | 2026-08-31 | TS-MIG-101 |
| `backend/**/*.js` | Backend Platform | Service and route conversion depends on typed boundary contracts. | High | 2026-09-30 | TS-MIG-102 |
| `*.js`, `*.cjs`, and `*.mjs` build/tooling config in repo root | Developer Experience | Ecosystem compatibility exceptions pending TS-first config decisions. | Medium | 2026-10-15 | TS-MIG-103 |
| `public/**/*.js` | Frontend Platform | Static/runtime browser artifacts reviewed as explicit JS exceptions. | Low | 2026-10-15 | TS-MIG-104 |

## Phase 1 foundation hardening progress

- [x] Established shared foundational types in `src/types/api.ts` (`Result`, `PaginatedResponse`, `TenantScope`, queued mutation response).
- [x] Added typed API config boundary by migrating `src/config/api.js` to `src/config/api.ts`.
- [x] Added typed partner HTTP boundary by migrating `src/api/partner/client.js` to `src/api/partner/client.ts`.
- [x] Normalized tenant scope usage in analytics/workflows clients onto shared `TenantScope` type.
- [x] Expanded shared boundary utilities with a shared typed HTTP client for auth headers, JSON requests, blob requests, and offline queue handling in migrated API clients.
- [x] Continued applying the shared HTTP client to additional API modules (`src/api/ai/client.ts`, `src/api/integrations/index.ts`) and standardized auth header handling.
- [x] Introduced runtime response validation at an integration boundary (`src/api/integrations/index.ts`) using `zod` schemas for safer typed parsing.
- [x] Migrated additional API compatibility boundaries to TypeScript (`src/api/functions.ts`, `src/api/entities.ts`) and removed JS shims where extensionless imports remain compatible.
- [x] Added typed function response envelopes for key integration calls (`googleAuth`, `googleClassroomSync`, `searchSchools`, `submitSchoolParticipationRequest`) and propagated safer optional-envelope handling into service/UI consumers to reduce weak dynamic contracts at API boundaries.
- [x] Added runtime validation for CSV roster row ingestion in `src/services/integrations/csvRosterService.ts` to replace unsafe row casting.
- [x] Removed residual type assertions in school envelope parsing by typing `zod` schemas directly to `SearchSchoolsData` and `SchoolRequestData`.
- [x] Migrated shared audit diff utility from `src/utils/auditDiff.js` to `src/utils/auditDiff.ts` with explicit change-entry typing.
- [x] Migrated navigation config from `src/config/navigation.js` to `src/config/navigation.ts` with explicit navigation item typing and role-aware helpers.
- [x] Migrated layout barrel export from `src/components/layout/index.js` to `src/components/layout/index.ts` to reduce JS compatibility surface.
- [ ] Continue applying the shared HTTP client and runtime-validation-backed contracts across remaining API modules and backend integration boundaries.

## Phase 0 kickoff checklist

- [x] Baseline inventory generated and committed.
- [x] Assign DRI owners for each top-level directory.
- [x] Add risk level + target sprint per directory.
- [x] Capture temporary JavaScript exception list with retirement dates.
