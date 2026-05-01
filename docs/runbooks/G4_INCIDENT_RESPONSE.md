# G4 Incident Response Runbook

## Triage

1. Check `/healthz` and confirm the reported build SHA.
2. Review Sentry for new errors or regressions.
3. Determine scope (single tenant vs. global).
4. Review `docs/observability.md` event/audit schema before adding emergency logs; do not log raw PII, message bodies, child names, tokens, cookies, or raw AI prompts.
5. Run `npm run check:pii-logging` before merging an incident hotfix that changes logging/instrumentation.

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
- Capture evidence for audit-critical incidents (permission denial, role change, moderation, messaging safety) without including raw sensitive payloads.
