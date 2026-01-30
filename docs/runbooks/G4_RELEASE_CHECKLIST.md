# G4 Release Checklist

Use this checklist for production deployments to ensure Gate G4 readiness.

## Pre-deploy

- [ ] `npm run preflight:env` passes locally or in CI.
- [ ] `VITE_NHOST_BACKEND_URL` is configured in the deploy environment.
- [ ] `VITE_SENTRY_DSN` is configured (recommended).
- [ ] `VITE_APP_ENV=production` is set.
- [ ] `VITE_MAINTENANCE_MODE` is `false` (or unset).

## Deploy

- [ ] Build succeeds (`npm run build`).
- [ ] `/healthz` returns `status: ok` and shows the expected build SHA.
- [ ] Smoke test core flows (login, role redirect, dashboard).

## Post-deploy

- [ ] Check Sentry for new releases tagged with the build SHA.
- [ ] Monitor errors and performance for 15 minutes.
