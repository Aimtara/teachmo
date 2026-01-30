# G4 Incident Response Runbook

## Triage

1. Check `/healthz` and confirm the reported build SHA.
2. Review Sentry for new errors or regressions.
3. Determine scope (single tenant vs. global).

## Mitigation options

- Toggle maintenance mode (`VITE_MAINTENANCE_MODE=true`) to halt traffic.
- Roll back to the last known good release.
- Apply config-only fixes (feature flags, env changes).

## Communications

- Post updates in the incident channel every 15–30 minutes.
- Notify impacted stakeholders (support, success, ops).

## Post-incident

- Document root cause, mitigation, and follow-up tasks.
- Add permanent fixes and regression tests.
