# TypeScript Migration Tracker

Generated: 2026-05-07T08:17:16.113Z

## Baseline totals (tracked files)

| Extension | Count |
| --- | ---: |
| .js | 218 |
| .jsx | 478 |
| .ts | 375 |
| .tsx | 91 |

## JS/TS inventory by top-level directory

| Directory | .js | .jsx | .ts | .tsx |
| --- | ---: | ---: | ---: | ---: |
| src | 7 | 477 | 244 | 91 |
| backend | 171 | 0 | 21 | 0 |
| nhost | 32 | 0 | 87 | 0 |
| (repo root) | 7 | 1 | 3 | 0 |
| public | 1 | 0 | 0 | 0 |
| .storybook | 0 | 0 | 2 | 0 |
| scripts | 0 | 0 | 1 | 0 |
| tests | 0 | 0 | 17 | 0 |

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

## Critical backend migration campaign

| Path | JS count | TS count | Priority | Owner placeholder | Current blocker | Next action | Exit criterion |
| --- | ---: | ---: | --- | --- | --- | --- | --- |
| backend/orchestrator | 20 | 18 | P0 | Backend Platform DRI | Schemas, state/store contracts, and engine coordination remain runtime JavaScript. | Convert schema and pure state helpers before stores and engine. | 0 runtime JS files outside reviewed shims; backend typecheck covers migrated modules. |
| backend/compliance | 10 | 0 | P0 | Security & Compliance DRI | Policy helpers and AI governance still rely on JavaScript-only contracts. | Convert data classification, redaction, audit, consent, and AI governance helpers. | 0 runtime JS files outside reviewed shims; compliance foundation tests pass. |
| backend/routes/orchestrator.js | 1 | 0 | P0 | Backend Platform DRI | Depends on typed orchestrator helpers plus authenticated/tenant request contracts. | Convert after orchestrator engine/store modules compile cleanly. | Route is TypeScript with Zod-narrowed request bodies and unchanged mount behavior. |
| backend/routes/compliance.js | 1 | 0 | P0 | Security & Compliance DRI | Depends on typed compliance helpers and shared Express request contracts. | Convert after compliance policy helpers compile cleanly. | Route is TypeScript with tenant/auth contracts and unchanged DSAR SQL semantics. |
| backend/routes/privacy.js | 1 | 0 | P0 | Privacy Product DRI | Depends on typed consent ledger and shared Express request contracts. | Convert after consent and audit helpers compile cleanly. | Route is TypeScript with narrowed privacy bodies and preserved subject-access behavior. |
| backend/app.js | 1 | 0 | P1 | Backend Platform DRI | Mounted routers and middleware need typed contracts first. | Convert only after imported routers/middleware have typed surfaces or no-debt shims. | Application entry is TypeScript with route mounts and middleware order preserved. |

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
- [x] Migrated domain barrel export from `src/domain/index.js` to `src/domain/index.ts` to reduce shared JS surface area.
- [x] Migrated React Query client helper from `src/lib/queryClient.js` to `src/lib/queryClient.ts` to shrink shared JS utility surface area.
- [x] Migrated active role session helper from `src/lib/activeRole.js` to `src/lib/activeRole.ts` with explicit role/null typing.
- [x] Migrated onboarding flow session helper from `src/lib/onboardingFlow.js` to `src/lib/onboardingFlow.ts` with explicit flow and path typing.
- [x] Migrated domain API modules (`src/domain/{assignments,learners,messaging,orgs}.js`) to TypeScript to reduce shared JS slice surface area.
- [x] Migrated i18n bootstrap from `src/i18n.js` to `src/i18n.ts` to reduce root-level shared JS setup surface.
- [x] Migrated Vitest setup bootstrap from `src/test/setup.js` to `src/test/setup.ts` and updated config references.
- [x] Migrated events domain module from `src/domains/events.js` to `src/domains/events.ts` with typed list/filter params.
- [x] Migrated children domain module from `src/domains/children.js` to `src/domains/children.ts` with typed mutation/query params.
- [x] Migrated messages domain module from `src/domains/messages.js` to `src/domains/messages.ts` with typed pagination and moderation inputs.
- [x] Migrated activities domain module from `src/domains/activities.js` to `src/domains/activities.ts` with typed list/order params.
- [x] Migrated submissions domain module from `src/domains/submissions.js` to `src/domains/submissions.ts` with typed mutation/query params.
- [x] Migrated calendar domain module from `src/domains/calendar.js` to `src/domains/calendar.ts` with typed filter/date-window params.
- [x] Migrated execution board domain module from `src/domains/executionBoard.js` to `src/domains/executionBoard.ts` with typed HTTP/query helpers.
- [x] Migrated messaging domain module from `src/domains/messaging.js` to `src/domains/messaging.ts` with typed thread/message inputs.
- [x] Migrated ops orchestrator domain module from `src/domains/opsOrchestrator.js` to `src/domains/opsOrchestrator.ts` with typed ops request helpers.
- [x] Migrated command center domain module from `src/domains/commandCenter.js` to `src/domains/commandCenter.ts` with typed action/audit inputs.
- [x] Migrated orchestrator domain module from `src/domains/orchestrator.js` to `src/domains/orchestrator.ts` with typed run/action helpers.
- [x] Migrated auth domain module from `src/domains/auth.js` to `src/domains/auth.ts` with typed profile lookup/mutation inputs.
- [x] Migrated audit log domain module from `src/domains/auditLog.js` to `src/domains/auditLog.ts` with typed sanitization/log input helpers.
- [x] Completed Phase 1 foundation hardening: shared HTTP/runtime-validation boundaries are applied across targeted API/domain modules; remaining `src/**/*.js` files are intentional mocks/tests/generated adapters tracked in the JS exception register.
- [ ] Continue applying the shared HTTP client and runtime-validation-backed contracts across remaining API modules and backend integration boundaries.

## Phase 0 kickoff checklist

- [x] Baseline inventory generated and committed.
- [x] Assign DRI owners for each top-level directory.
- [x] Add risk level + target sprint per directory.
- [x] Capture temporary JavaScript exception list with retirement dates.
