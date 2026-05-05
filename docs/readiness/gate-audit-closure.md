# Gate Audit Closure

Generated: 2026-05-03  
Last updated: 2026-05-04  
Baseline commit: `dad6ee8`

This document tracks closure status for the remaining Gate 2, Gate 3, and Gate 4 items. It separates implemented repository evidence from live-environment proof that still requires staging/production credentials.

## Baseline status

| Gate item | Previous audit status | Baseline repository evidence | Current launch classification |
| --- | --- | --- | --- |
| E10 Directory flow | Partial/stubbed | Directory pages/adapters exist (`AdminDirectoryImport`, `AdminDirectoryApprovals`, directory Nhost functions). May 4 closure also moved `SchoolDirectoryAdmin` reads/writes behind `src/domains/directory/admin.ts`, reducing direct UI API exposure. End-to-end live directory request proof is not attached. | Controlled pilot candidate after role smoke; broad launch needs live evidence. |
| E11 Approvals + reason capture | Partial/stubbed | Approval adapters support approve/reject reason payloads. UI and audit evidence need validation. | Controlled pilot candidate if reason-required checks pass. |
| E12 CSV/OneRoster-lite import | Partial/stubbed | CSV preview/import and jobs exist; OneRoster-lite deterministic mapping needs stronger evidence. | Pilot candidate with dry-run preview; live import evidence required. |
| E13 Deterministic identity mapping | Not started | Implemented v0 deterministic matcher in `nhost/functions/_shared/directory/identityMapping.js` with Jest coverage for external/source ID precedence, scoped email, guardian relationship keys, low-confidence name/date signals, and conflict-to-manual-review behavior. | Pilot candidate after wiring preview UI/live imports to expose unresolved review queues. |
| E14 Messaging SLO + retries | Partial/stubbed | Messaging domain and notification queue exist; SLO/retry runbook now defines status, retry, idempotency, and evidence expectations. | Pilot candidate after staging retry evidence is attached. |
| E15 Digest reliability | Partial/stubbed | Weekly brief/digest workflows exist; reliability runbook now defines duplicate prevention, recovery, and staging-run evidence. | Pilot candidate after staging digest recovery evidence is attached. |
| E16 Office hours booking | Not started | Implemented frontend/domain v0 for availability slots, booking/cancel/reschedule state, conflict prevention, and timezone-safe ISO handling. | Controlled pilot candidate with in-memory v0; broad launch requires backend persistence and notification wiring. |
| E17 Assignments sync v0 | Partial/stubbed | Teacher assignments/backend route exist; assignments sync runbook now defines dry-run/sync-now contract and live LMS evidence. | Pilot candidate with dry-run; live LMS proof required. |
| E18 Admin sync now + troubleshooting | Partial/stubbed | Integration health calls were moved behind `src/domains/integrations/rosterHealth.ts`; May 4 closure added admin audit/policy-simulation adapters and proof templates for sync/dashboard validation. SIS sync page remains a broader admin adapter follow-up. | Pilot candidate for dry-run troubleshooting; live sync evidence still manual. |
| E20 Adoption/delivery/sync dashboards validation | Partial/stubbed | `docs/product/gate-4-analytics-admin.md` now defines adoption, delivery, sync-health contracts, stale indicators, and PII-safe export rules. | Pilot candidate with mock data; broad launch needs live data validation evidence. |
| E22 Runbooks + support playbook publication evidence | Partial/stubbed | `docs/runbooks/support-playbook.md` now covers severity, SLAs, escalation, support macros, and publication evidence requirements. | Manual publication proof required before broad launch. |
| E23 Command Center approvals/escalations live proof | Partial/stubbed | Command Center page/domain exists and `docs/readiness/evidence/command-center-live-proof-template.md` defines exact live proof steps and evidence. | Manual live-proof blocker. |

## Closure criteria for this pass

- E13 and E16 must not remain silent unknowns: implement a v0, or explicitly document/gate them as launch blockers.
- Gate items that require live credentials remain manual and require evidence templates.
- Any UI direct backend calls touched for these gates should move behind adapters and reduce API-boundary exceptions.

## May 4 closure update

- API-boundary exceptions were reduced **37 → 0** by extracting AI transparency, directory admin, partner incentives/submissions, execution board fallback, audit-log viewer, AI policy simulation, personalized discover, AI prompt library, school requests, system health, tenant domains, admin impersonation, tenant/profile hooks, admin analytics, backup/recovery, compliance, notifications, observability, partner admin, and SIS admin calls into domain modules.
- Browser evidence improved: `npm run test:a11y` now runs under Vitest and passes 22 checks; `npm run test:e2e` passes 7 browser smokes with 5 explicit credential/environment skips.
- New live-proof templates were added for directory identity conflicts, office-hours verification, messaging/digest retry proof, assignments sync proof, and admin sync/dashboard validation.

## May 4 operational automation update

- Added `role-smoke-gate-proofs` automation with local/mock Playwright coverage for Parent, Teacher, Partner, Admin, and Ops/system-admin route access.
- Added Gate 2/3/4 Playwright proof specs:
  - Gate 2: directory import, SIS roster, integration health, and explicit human-review annotation for identity mapping conflicts.
  - Gate 3: messaging, office-hours/calendar, teacher assignments, and parent digest/today surfaces.
  - Gate 4: admin analytics, integration health/sync troubleshooting, and command-center escalation routes.
- Added `scripts/ops/gate-proof-report.mjs` to emit a Markdown review packet for high-risk flows. Credentialed staging runs must upload the Playwright HTML report and gate proof summary before feature enablement.
- Local evidence from this automation pass:
  - `npm run e2e:roles`: PASS, 5 role-smoke tests.
  - `npm run e2e:gates` with scoped `VITE_FEATURE_*` flags: PASS, 7 Gate proof tests. Integration-health API proxy warnings were observed because the local backend was not running; route/UI smoke still passed. Credentialed staging remains required for API/data assertions.

## Gate automation mapping

| Gate item | New automation | Human review still required |
| --- | --- | --- |
| E10 Directory flow | `tests/e2e/gate2-directory.spec.ts` checks directory/import/admin integration routes render. | Real CSV/OneRoster-lite import evidence and redacted import logs. |
| E11 Approvals + reason capture | Gate 2 proof reaches approval-capable directory surfaces. | Reviewer signoff for approve/reject reason capture in staging. |
| E12 CSV/OneRoster-lite import | Gate 2 route smoke plus schema/metadata CI. | Staging upload/preview proof with safe fixture data. |
| E13 Deterministic identity mapping | Gate 2 proof adds a `human-review-required` annotation for identity conflicts. | Conflict queue review and decision evidence. |
| E14/E15 Messaging and digest reliability | Gate 3 proof reaches messaging and parent digest/today surfaces. | Retry/backoff/idempotency and scheduled digest recovery logs. |
| E16 Office hours booking | Gate 3 proof reaches office-hours/calendar surfaces under scoped test flags. | Persistent booking/cancel/reschedule and notification evidence. |
| E17 Assignments sync | Gate 3 proof reaches teacher assignment surfaces. | LMS/mock dry-run sync report and optional live sync evidence. |
| E18/E20 Admin sync + dashboards | Gate 4 proof reaches analytics and integration-health surfaces. | Source-data reconciliation and sync-now troubleshooting evidence. |
| E23 Command Center proof | Gate 4 proof reaches command-center route. | Live approval/escalation proof packet. |

## May 5 closure sprint update

| Gate item | Repository-side change | Automated evidence | Remaining live proof |
| --- | --- | --- | --- |
| E12/E13 CSV import and identity mapping | `sis-roster-import` now supports `previewOnly`/`dryRun`, returns identity decisions/conflicts, records preview-only metadata, and skips roster mutation in preview mode. | `npx jest --config jest.backend.config.cjs nhost/functions/__tests__/sis-roster-import.test.js`: PASS, 18 tests including dry-run identity preview. | Staging CSV/OneRoster-lite preview with exact ID, scoped email, relationship, duplicate, and conflict rows. |
| E14 Messaging reliability | Added deterministic idempotency, retry classification, bounded backoff, and PII-safe delivery-attempt summary helpers; message telemetry no longer stores message preview text. | `npx vitest run src/domains/__tests__/messagingReliability.test.ts`: PASS. | Staging retry/backoff/idempotency evidence and scheduler/alert logs. |
| E16 Office hours | Added reschedule helper and tests for cancellation/rebooking, timezone preservation, self-book denial, and conflict prevention. | `npx vitest run src/domains/__tests__/officeHours.test.ts`: PASS. | Feature remains scoped; live persistence, notifications, and real parent/teacher role proof required. |
| E17 Assignments sync | Added dry-run validator with status/errors/duplicate counts for LMS/mock sync proof. | Covered by typecheck and domain import in full Vitest/typecheck runs. | LMS test tenant or approved mock dry-run evidence. |
| E23 Command Center | Backend route now requires authenticated admin roles; frontend domain sends bearer/E2E tokens; non-admin denial is tested. | `npx jest --config jest.backend.config.cjs backend/__tests__/commandCenter.test.js`: PASS. | Live approval/escalation proof with audit/event screenshots. |

