# TypeScript Migration Tracker

Generated: 2026-05-01T22:30:00.000Z

Updated: 2026-05-06 — compliance-foundations work added reviewed backend Express runtime JavaScript modules for policy helpers, privacy APIs, and Jest/Supertest coverage. The ratchet baseline was intentionally refreshed with no `any`, `@ts-ignore`, or `@ts-expect-error` increase and future JS growth remains blocked.

## Baseline totals (tracked files)

| Extension | Count |
| --- | ---: |
| .js | 232 |
| .jsx | 478 |
| .ts | 354 |
| .tsx | 79 |

## Production ratchet baseline

The production hardening pass adds a failing ratchet gate. Current committed baseline:

| Metric | Baseline | Budgeted increase |
| --- | ---: | ---: |
| `.js` files | 232 | 0 |
| `.jsx` files | 478 | 0 |
| `any` tokens in `.ts/.tsx` | 507 | 0 |
| `@ts-ignore` | 0 | 0 |
| `@ts-expect-error` | 0 | 0 |

Commands:

```bash
npm run check:ts-ratchet
npm run migration:ts:inventory
```

Baseline file: `docs/readiness/ts-ratchet-baseline.json`. Refreshing it must be intentional, reviewed, and paired with this tracker.

## Next recommended slices

| Slice | Owner placeholder | Target date placeholder | Notes |
| --- | --- | --- | --- |
| Admin GraphQL pages | Frontend Platform DRI | YYYY-MM-DD | Move raw `graphqlRequest` calls behind admin domain modules. |
| Partner portal REST pages | Partner Platform DRI | YYYY-MM-DD | Complete service-layer wrappers for direct `fetch` usage. |
| Backend route contracts | Backend Platform DRI | YYYY-MM-DD | Introduce typed request/response schemas before JS-to-TS conversion. |
| Nhost function shared utilities | Data Platform DRI | YYYY-MM-DD | Convert shared function helpers and reduce `any` budgets. |

## JS/TS inventory by top-level directory

| Directory | .js | .jsx | .ts | .tsx |
| --- | ---: | ---: | ---: | ---: |
| src | 7 | 475 | 187 | 60 |
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

## Compliance-foundations exception review

- [x] Reviewed intentional backend runtime JavaScript additions for compliance policy helpers and privacy APIs on `2026-05-06`.
- [x] Preserved zero future JS-growth, `any`, `@ts-ignore`, and `@ts-expect-error` budgets in `docs/readiness/ts-ratchet-baseline.json`.
- [ ] Migrate backend compliance helpers and privacy APIs once typed Express request/response contracts are established.

## Phase 2 frontend vertical-slice kickoff progress

- [x] Continued Phase 2 shared UI conversion work across hooks/shared utilities and provider components.
- [x] Migrated shared premium UI components `src/components/shared/{PremiumBadge,PremiumGate}.jsx` to TypeScript (`.tsx`) with typed props and children contracts.
- [x] Migrated shared route guard utilities `src/components/shared/{FeatureGate,RoleGuard}.jsx` to TypeScript (`.tsx`) with typed props and redirect/authorization handling.
- [x] Migrated shared accessibility utility `src/components/shared/SkipLink.jsx` to `src/components/shared/SkipLink.tsx` with typed props and focus/blur handlers.
- [x] Migrated shared navigation utilities `src/components/shared/{Breadcrumbs,BreadcrumbNavigation}.jsx` to TypeScript (`.tsx`) with typed breadcrumb item contracts and route helpers.
- [x] Migrated async safety utilities `src/components/shared/{AsyncBoundary,GlobalErrorBoundary,ErrorBoundary}.jsx` to TypeScript (`.tsx`) with typed error-boundary/HOC contracts.
- [x] Migrated shared media/loading utilities `src/components/shared/{LazyImage,LazyPageWrapper,LazyRoute}.jsx` to TypeScript (`.tsx`) with typed props and safer lazy-loading/observer handling.
- [x] Migrated shared empty-state primitives `src/components/shared/{EmptyStates,UniversalEmptyState}.jsx` to TypeScript (`.tsx`) with typed action/item contracts and typed props across exported variants.
- [x] Migrated legal modal primitive `src/components/shared/TermsModal.jsx` to `src/components/shared/TermsModal.tsx` with typed open-state and close-handler contracts.
- [x] Migrated action confirmation modal `src/components/shared/ConfirmationModal.jsx` to `src/components/shared/ConfirmationModal.tsx` with typed preset/modal props and confirmation-state handlers.
- [x] Migrated quick action launcher `src/components/shared/QuickActionsMenu.jsx` to `src/components/shared/QuickActionsMenu.tsx` with typed action definitions and button contracts.
- [x] Migrated focus-style provider `src/components/shared/FocusStyles.jsx` to `src/components/shared/FocusStyles.tsx` with typed children contract and DOM style lifecycle cleanup.
- [x] Migrated shared API context provider `src/components/shared/ApiProvider.jsx` to `src/components/shared/ApiProvider.tsx` with typed context value, cache/rate-limit contracts, and provider/hook signatures.
- [x] Migrated shared tone utility `src/components/shared/TeachmoTone.jsx` to `src/components/shared/TeachmoTone.ts` with typed tone-state contracts and deterministic helper typing.
- [x] Migrated UX rules utility `src/components/shared/UXReviewRule.jsx` to `src/components/shared/UXReviewRule.tsx` with typed rule/checkpoint contracts and violation props.
- [x] Migrated standard loading-state helpers `src/components/shared/StandardLoadingStates.jsx` to `src/components/shared/StandardLoadingStates.tsx` with typed prop contracts for skeleton/page loaders.
- [x] Migrated accessibility helper toolkit `src/components/shared/AccessibilityHelpers.jsx` to `src/components/shared/AccessibilityHelpers.tsx` with typed hooks/components for keyboard navigation, live regions, and form/button accessibility props.
- [x] Migrated async safety utility `src/components/shared/AsyncBoundary.jsx` to `src/components/shared/AsyncBoundary.tsx` with typed HOC fallback/error contracts and generic `safeAsync` return typing.
- [x] Migrated shared media utility `src/components/shared/LazyImage.jsx` to `src/components/shared/LazyImage.tsx` with typed props, intersection observer ref typing, and safe cleanup.
- [x] Migrated shared empty-state primitives `src/components/shared/EmptyStates.jsx` to `src/components/shared/EmptyStates.tsx` with typed action/item contracts and typed props across exported empty-state variants.
- [ ] Continue remaining hook-slice consumers and then proceed to shared UI primitive slices.

## Phase 0 kickoff checklist

- [x] Baseline inventory generated and committed.
- [x] Assign DRI owners for each top-level directory.
- [x] Add risk level + target sprint per directory.
- [x] Capture temporary JavaScript exception list with retirement dates.
