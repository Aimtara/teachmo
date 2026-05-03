# Gate Audit Closure

Generated: 2026-05-03  
Baseline commit: `dad6ee8`

This document tracks closure status for the remaining Gate 2, Gate 3, and Gate 4 items. It separates implemented repository evidence from live-environment proof that still requires staging/production credentials.

## Baseline status

| Gate item | Previous audit status | Baseline repository evidence | Current launch classification |
| --- | --- | --- | --- |
| E10 Directory flow | Partial/stubbed | Directory pages/adapters exist (`AdminDirectoryImport`, `AdminDirectoryApprovals`, directory Nhost functions), but end-to-end live directory request proof is not attached. | Controlled pilot candidate after role smoke; broad launch needs live evidence. |
| E11 Approvals + reason capture | Partial/stubbed | Approval adapters support approve/reject reason payloads. UI and audit evidence need validation. | Controlled pilot candidate if reason-required checks pass. |
| E12 CSV/OneRoster-lite import | Partial/stubbed | CSV preview/import and jobs exist; OneRoster-lite deterministic mapping needs stronger evidence. | Pilot candidate with dry-run preview; live import evidence required. |
| E13 Deterministic identity mapping | Not started | Implemented v0 deterministic matcher in `nhost/functions/_shared/directory/identityMapping.js` with Jest coverage for external/source ID precedence, scoped email, guardian relationship keys, low-confidence name/date signals, and conflict-to-manual-review behavior. | Pilot candidate after wiring preview UI/live imports to expose unresolved review queues. |
| E14 Messaging SLO + retries | Partial/stubbed | Messaging domain and notification queue exist; SLO/retry runbook now defines status, retry, idempotency, and evidence expectations. | Pilot candidate after staging retry evidence is attached. |
| E15 Digest reliability | Partial/stubbed | Weekly brief/digest workflows exist; reliability runbook now defines duplicate prevention, recovery, and staging-run evidence. | Pilot candidate after staging digest recovery evidence is attached. |
| E16 Office hours booking | Not started | Implemented frontend/domain v0 for availability slots, booking/cancel/reschedule state, conflict prevention, and timezone-safe ISO handling. | Controlled pilot candidate with in-memory v0; broad launch requires backend persistence and notification wiring. |
| E17 Assignments sync v0 | Partial/stubbed | Teacher assignments/backend route exist; assignments sync runbook now defines dry-run/sync-now contract and live LMS evidence. | Pilot candidate with dry-run; live LMS proof required. |
| E18 Admin sync now + troubleshooting | Partial/stubbed | Admin integration health/SIS pages exist, but direct UI API calls remain and need adapter/test coverage. | Pilot blocker until adapter and troubleshooting evidence improved. |
| E20 Adoption/delivery/sync dashboards validation | Partial/stubbed | Admin analytics exists; direct UI API calls and validation evidence remain. | Pilot blocker until data contracts/stale-state evidence documented. |
| E22 Runbooks + support playbook publication evidence | Partial/stubbed | Several G4 runbooks exist; support playbook publication evidence template missing. | Manual readiness blocker. |
| E23 Command Center approvals/escalations live proof | Partial/stubbed | Command Center page/domain exists; live proof/evidence template missing. | Manual live-proof blocker. |

## Closure criteria for this pass

- E13 and E16 must not remain silent unknowns: implement a v0, or explicitly document/gate them as launch blockers.
- Gate items that require live credentials remain manual and require evidence templates.
- Any UI direct backend calls touched for these gates should move behind adapters and reduce API-boundary exceptions.

