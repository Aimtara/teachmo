# G4 Release Checklist

Use this checklist for controlled pilot and production deployments.

## Automated pre-deploy gates

- [ ] `npm ci`
- [ ] `npm run preflight:example`
- [ ] `npm run check:secret-hygiene`
- [ ] `npm run check:api-boundaries`
- [ ] `npm run check:production-auth-safety`
- [ ] `npm run check:hasura-readiness`
- [ ] `npm run check:ts-ratchet`
- [ ] `npm run check:pii-logging`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test -- --run`
- [ ] `npm run test:smoke`
- [ ] `npm run build`
- [ ] `npm run check:size`
- [ ] `npm run check:production`
- [ ] `npm run check:launch`

## Environment pre-deploy

- [ ] `VITE_NHOST_BACKEND_URL` or `VITE_NHOST_SUBDOMAIN`/`VITE_NHOST_REGION` is configured.
- [ ] `VITE_APP_ENV=production` for production or `staging` for staging.
- [ ] `VITE_MAINTENANCE_MODE=false` or unset unless executing planned maintenance.
- [ ] No bypass flags are enabled outside local/test (`VITE_E2E_BYPASS_AUTH=false`, `VITE_BYPASS_AUTH=false`).
- [ ] `VITE_SENTRY_DSN` and Sentry release environment are configured.
- [ ] Hasura metadata/migrations are applied and drift checked using the Hasura readiness runbook.

## Deploy verification

- [ ] Build succeeds (`npm run build`) with the expected SHA.
- [ ] `/healthz` returns `status: ok`, expected build SHA, build time, app env, Nhost configured `yes`, and maintenance mode state.
- [ ] `/healthz` remains accessible when maintenance mode is enabled.
- [ ] Smoke test login, role redirect, parent dashboard, teacher dashboard, partner dashboard, admin/ops access control, discover/explore, messaging, and unauthorized state.
- [ ] Run `npm run e2e:ops` against staging with test users if credentials are available.
- [ ] Run accessibility smoke (`npm run test:a11y` and `npm run e2e:a11y` where browser deps are available).

## Post-deploy

- [ ] Check Sentry for the deployed release/build SHA.
- [ ] Confirm production/staging audit events are inserted for sensitive actions without raw PII.
- [ ] Monitor errors, performance, and alert routing for at least 30 minutes.
- [ ] Capture evidence in the release issue/PR: healthz screenshot/output, CI run URL, Sentry release view, Hasura metadata verification, and smoke checklist.
