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

## Urgent rotation note

An older tracked Nhost config contained a Google OAuth client-secret-looking value. It has been removed from source control, but the value must be treated as compromised:

1. Rotate the Google OAuth client secret in Google Cloud.
2. Invalidate/delete the old secret.
3. Update the Nhost production/staging dashboard or secret manager with the new value.
4. Attach evidence to `docs/readiness/evidence/production-smoke-template.md` or the release issue.

Do not store OAuth client secrets in `nhost/nhost.toml`; use `{{ secrets.GOOGLE_OAUTH_CLIENT_SECRET }}` or the Nhost dashboard secret store.

## Nhost config safety

- Deployable config is `nhost/nhost.toml` and must pass `npm run check:nhost-config-safety`.
- Local-only examples may use `nhost/nhost.local.example.toml`; never deploy that file.
- Production config must avoid wildcard CORS, dev mode, public DB access, anonymous auth, disabled email verification, and enabled Hasura console.

## Validation

- `npm run preflight:env`
- `npm run preflight:example`
- `npm run check:secret-hygiene`
- `npm run check:nhost-config-safety`
- `npm run check:production-auth-safety`
- `npm run check:production`
