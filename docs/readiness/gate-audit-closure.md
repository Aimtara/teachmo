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

- API-boundary exceptions were reduced **37 → 30** by extracting AI transparency, directory admin, partner incentives/submissions, execution board fallback, audit-log viewer, and AI policy simulation calls into domain modules.
- Browser evidence improved: `npm run test:a11y` now runs under Vitest and passes 22 checks; `npm run test:e2e` passes 7 browser smokes with 5 explicit credential/environment skips.
- New live-proof templates were added for directory identity conflicts, office-hours verification, messaging/digest retry proof, assignments sync proof, and admin sync/dashboard validation.

