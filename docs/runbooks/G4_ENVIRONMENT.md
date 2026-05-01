# G4 Environment & Secrets

## Required frontend variables

- `VITE_NHOST_BACKEND_URL` — Nhost backend URL.
- `VITE_APP_ENV=production` — production environment tag.

## Recommended frontend variables

- `VITE_SENTRY_DSN` — Sentry DSN for production error tracking.
- `VITE_SENTRY_TRACES_SAMPLE_RATE` / `VITE_SENTRY_REPLAY_SAMPLE_RATE` — numeric sample rates.

## Optional frontend variables

- `VITE_MAINTENANCE_MODE=true|false` — emergency maintenance page. `/healthz` stays available.
- `VITE_NHOST_SUBDOMAIN` / `VITE_NHOST_REGION` — alternative Nhost client configuration.
- `VITE_NHOST_FUNCTIONS_URL` — custom Nhost functions endpoint.
- `VITE_ENABLE_INTERNAL_ROUTES=false` — internal/demo routes. Keep false/unset in production.
- `VITE_USE_GRAPHQL_EVENTS`, `VITE_USE_GRAPHQL_ACTIVITIES`, `VITE_USE_GRAPHQL_CALENDAR`, `VITE_USE_GRAPHQL_MESSAGES`, `VITE_USE_SCOPED_THREAD_CREATE` — feature flags documented in `../feature-flags.md`.

## Prohibited in staging/production

The following examples are **UNSAFE_FOR_PRODUCTION** and must never be enabled in staging or production:

- Setting the E2E bypass auth flag to enabled.
- Setting any client bypass auth flag to enabled.
- Any `VITE_*SECRET`, `VITE_*TOKEN`, `VITE_*PASSWORD`, or `VITE_*KEY` unless explicitly documented as public and allowlisted.
- Setting backend auth mode to mock for production backend runtime.
- Hasura/Nhost admin secrets in frontend deploy variables.

## Server-side secrets

Keep these only in backend/Nhost function runtime secret stores:

- `NHOST_ADMIN_SECRET`
- `HASURA_GRAPHQL_ADMIN_SECRET`
- `OPENAI_API_KEY`
- OAuth client secrets
- SMTP/Postmark/SendGrid credentials
- invite, digest, directory sync, and event webhook tokens

## Validation

- `npm run preflight:env`
- `npm run preflight:example`
- `npm run check:secret-hygiene`
- `npm run check:production-auth-safety`
- `npm run check:production`
