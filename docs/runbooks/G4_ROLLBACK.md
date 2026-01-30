# G4 Rollback Runbook

## When to rollback

- Incident severity is high and cannot be mitigated quickly.
- `/healthz` shows `status: degraded` with missing critical config.
- Error rates spike immediately after deployment.

## Steps

1. Revert to the last known good build in your deployment platform (Vercel/Docker).
2. Confirm `/healthz` shows the previous build SHA.
3. Set `VITE_MAINTENANCE_MODE=true` if rollback is blocked and you need to halt traffic.
4. Notify stakeholders and document the rollback in the incident timeline.

## Verification

- [ ] `/healthz` returns `status: ok`.
- [ ] Sentry errors return to baseline.
- [ ] Core flows pass smoke testing.
