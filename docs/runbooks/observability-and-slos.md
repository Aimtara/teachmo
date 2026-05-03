# Observability, Alerting, and SLO Runbook

## Required production wiring

- Sentry DSN configured server-side in deployment settings, not committed.
- `VITE_APP_ENV=production` or `staging`.
- Release SHA/build metadata visible in `/healthz` and Sentry releases.
- Source-map upload policy approved by security; source maps must not expose secrets.
- Redaction verification using `npm run check:pii-logging` and smoke events.

## Core SLOs and alert thresholds

| Signal | Target | Alert threshold | Evidence required |
| --- | --- | --- | --- |
| Frontend error rate | < 1% sessions | > 2% for 10 minutes | Sentry chart and release filter |
| API 5xx rate | < 0.5% requests | > 1% for 5 minutes | API logs/dashboard |
| Auth failure spike | Baseline + 3σ | sustained spike for 10 minutes | Auth logs with PII redacted |
| Permission-denied spike | Baseline + 3σ | spike after deploy | Hasura/backend audit samples |
| Message send failures | < 1% sends | > 2% for 10 minutes | Messaging metrics/audit |
| AI safety block rate | Baseline tracked | sudden drop to zero or spike > 2x | AI governance report |
| p95 route latency | < 2.5s frontend, < 500ms API | 2x target for 15 minutes | RUM/API metrics |
| Uptime | 99.5% pilot, 99.9% production target | any 5-minute outage | Uptime monitor |

## Alert routing

1. Page on-call engineer for critical auth/RBAC/data/privacy alerts.
2. Notify product/support for user-visible outage.
3. Escalate to security/privacy owner for PII, child-data, audit, or AI-safety incidents.
4. Open incident record and attach screenshots/log excerpts with redaction.

## Smoke event checklist

- `permission.denied`
- `message.sent`
- `role.changed`
- `school_request.submitted`
- `moderation.action`
- `onboarding.complete`
- AI governance decision, if AI feature enabled

## Manual evidence

Attach alert test evidence to `docs/readiness/evidence/incident-response-rehearsal-template.md` or the release issue. Do not mark alert routing complete until a real alert receipt screenshot/log is available.
