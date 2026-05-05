# Synthetic Monitoring

Teachmo synthetic monitoring runs the Playwright critical path suite against
staging/production every 15 minutes and uploads both Playwright artifacts and an
operations report.

## Workflow

Workflow: `.github/workflows/synthetic-monitoring.yml`

Triggers:

- `schedule`: every 15 minutes.
- `workflow_dispatch`: manual staging/production execution.

Scheduled runs require configured target URLs and synthetic credentials. Local
developer runs may continue to use mock sessions.

## Required secrets

| Secret | Purpose |
| --- | --- |
| `SYNTHETIC_BASE_URL` | Frontend URL for scheduled browser checks |
| `SYNTHETIC_API_URL` | Backend API URL for health checks |
| `SYNTHETIC_PARENT_EMAIL` / `SYNTHETIC_PARENT_PASSWORD` | Parent critical-path user |
| `SYNTHETIC_TEACHER_EMAIL` / `SYNTHETIC_TEACHER_PASSWORD` | Teacher critical-path user |
| `SYNTHETIC_ADMIN_EMAIL` / `SYNTHETIC_ADMIN_PASSWORD` | Admin/system critical-path user |
| `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `ALERT_WEBHOOK_URL` | Optional alert-routing verification |

## Local run

```bash
npm run e2e:synthetic
```

This starts the local Vite dev server via Playwright config and uses mock
sessions for role-gated surfaces.

## Protected run behavior

The workflow sets `SYNTHETIC_REQUIRED=true`, so the Playwright suite fails if
required synthetic credentials are missing. Each synthetic user verifies a
separate critical path:

- public landing and login reachability;
- parent login plus dashboard/discover/AI assistant route;
- teacher login plus dashboard/assignment surfaces;
- admin login plus integration health and analytics surfaces.

`scripts/ops/synthetic-monitor.mjs --execute` performs a reachability check,
runs the same Playwright suite, and records a redacted JSON/Markdown report in
`artifacts/ops/`.

## Alert verification

Manual dispatch can set `verify_alerts=true`. The report then fails if alerting
credentials are missing, allowing maintainers to verify Sentry/Slack/PagerDuty
routing without changing the browser test suite.

Manual dispatch also supports `require_credentials`. Keep it enabled for
staging/production evidence. Disable it only for local/advisory route
reachability checks that intentionally allow mock sessions.
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
