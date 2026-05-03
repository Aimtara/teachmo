# Gate 3 — Messaging / Assignments / Scheduling

Generated: 2026-05-03

## Status

| Item | Current state | Launch classification | Evidence |
| --- | --- | --- | --- |
| E14 Messaging SLO + retries | Partially implemented through existing notification queue and messaging surfaces; retry/SLO proof remains docs/manual. | Controlled pilot only with monitoring evidence. | `docs/runbooks/observability-and-slos.md`; backend notification tests. |
| E15 Digest reliability | Existing weekly brief/digest workflows remain; duplicate prevention and recovery require live scheduled-run evidence. | Pilot blocker until scheduler evidence is attached. | `.github/workflows/send_digests.yml`, weekly brief code paths. |
| E16 Office hours booking | **Implemented v0 in-repo** with deterministic domain helpers and UI for availability blocks, slot booking, conflict prevention, cancellation, timezone-safe ISO timestamps, and local audit event hook. Persistence remains adapter-backed/local pending live backend tables. | Pilot candidate if feature is enabled and backend persistence is wired; broad launch needs live role smoke. | `src/domains/officeHours.ts`, `src/components/calendar/OfficeHours.jsx`, `src/domains/__tests__/officeHours.test.ts`. |
| E17 Assignments sync v0 | Teacher assignments/backend route exist; external LMS sync remains dry-run/manual-live proof. | Pilot candidate for mock/dry-run only. | `src/domains/assignments.ts`, `backend/routes/assignments.js`. |

## E16 v0 behavior

- Teachers/admins can add timezone-safe availability blocks.
- Parent/student users can book available slots.
- Overlapping or already-booked slots are rejected deterministically.
- Bookings can be canceled and returned to the available pool.
- Audit events are emitted through a callback so live backend integrations can persist them without changing UI behavior.
- The feature is represented by `FEATURES.OFFICE_HOURS` and remains explicit for launch-scoping decisions.

## Remaining launch evidence

- Wire office-hours blocks/bookings to live Nhost/Hasura or backend API tables.
- Run parent/teacher role smoke with real users.
- Verify notification/reminder delivery.
- Confirm calendar timezone behavior across district timezone and browser timezone.
