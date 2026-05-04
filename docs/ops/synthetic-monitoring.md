# Synthetic Monitoring and Alert Routing

Generated: 2026-05-04

Teachmo synthetic monitoring is repository-controlled through `.github/workflows/synthetic-monitoring.yml`, `tests/e2e/synthetic-monitor.spec.ts`, and `scripts/ops/synthetic-monitor.mjs`.

## What runs

| Layer | Automation | Evidence |
| --- | --- | --- |
| Public reachability | Playwright visits `/`, `/login`, and `/api`/configured health URLs. | Playwright report |
| Authenticated synthetic accounts | Optional staging/production login via `SYNTHETIC_*` secrets. | Playwright report |
| Critical routes | AI assistant, SIS/integration, messages, directory, analytics. | Playwright report |
| Backend health | `/api/healthz` returns safe API/DB/build status without tenant data. | HTTP response |
| Alert routing | `scripts/ops/synthetic-monitor.mjs` can trigger/check Sentry/Slack when tokens are configured. | JSON/Markdown artifact |

## Schedule

The workflow runs:

- every 15 minutes,
- on demand through `workflow_dispatch`,
- against the URL supplied by `SYNTHETIC_BASE_URL` or the dispatch input.

## Required secrets

| Secret | Purpose |
| --- | --- |
| `SYNTHETIC_BASE_URL` | Production/staging base URL. |
| `SYNTHETIC_PARENT_EMAIL`, `SYNTHETIC_PARENT_PASSWORD` | Optional parent login test. |
| `SYNTHETIC_TEACHER_EMAIL`, `SYNTHETIC_TEACHER_PASSWORD` | Optional teacher login test. |
| `SYNTHETIC_ADMIN_EMAIL`, `SYNTHETIC_ADMIN_PASSWORD` | Optional admin login test. |
| `SYNTHETIC_SENTRY_DSN`, `SENTRY_ALERT_WEBHOOK_URL` | Optional alert-routing verification. |

## Failure behavior

- Missing credentials skip only credentialed paths and are listed in the report.
- Public reachability and health failures fail the workflow.
- Alert verification is fail-closed only when `SYNTHETIC_VERIFY_ALERTS=true`.

## Safe health endpoint

`/api/healthz` returns:

- API status,
- DB probe status,
- build SHA/app environment,
- timestamp.

It does not require auth and does not expose tenant data, secrets, counts, or user identifiers.
