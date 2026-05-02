# Observability, Audit, and PII-Safe Logging

Teachmo production telemetry must help operators debug safely without exposing K-12 PII.

## Minimum event schema

All analytics/audit events should follow `src/observability/events.ts`:

- `name`: canonical event name (`message.sent`, `permission.denied`, etc.)
- `timestamp`: ISO-8601 event time
- `actor`: hashed or opaque user ID plus role; no names/emails
- `scope`: organization/school/classroom IDs when safe
- `entity`: entity type and opaque ID
- `release`: build SHA/environment
- `metadata`: redacted, bounded, non-PII metadata

Never include message bodies, child/student names, raw AI prompts, tokens, cookies, passwords,
addresses, phone numbers, or raw email addresses.

## Implemented safeguards

- `src/observability/redaction.ts` centralizes redaction for telemetry/logging.
- `src/observability/events.ts` builds safe event payloads for sensitive production actions.
- `src/observability/telemetry.ts` sanitizes metadata before calling the Nhost `track-event` function.
- `src/domains/auditLog.ts` bounds and redacts audit metadata/snapshots before inserting.
- `npm run check:pii-logging` flags dangerous logging patterns before launch.

## Required production verification

- Confirm `VITE_SENTRY_DSN` is configured in staging/production.
- Confirm Sentry release tags match `/healthz` build SHA.
- Confirm Nhost `track-event` function writes analytics events with no PII.
- Confirm `audit_log` Hasura permissions are append-only for non-admin actors.
- Configure alert routing and incident ownership before district pilot expansion.
