# G4 Environment & Secrets

## Required (frontend)

- `VITE_NHOST_BACKEND_URL` — Nhost backend URL.

## Recommended

- `VITE_SENTRY_DSN` — Sentry DSN for production error tracking.
- `VITE_APP_ENV=production` — app environment tag.

## Optional

- `VITE_MAINTENANCE_MODE=true|false` — kill switch for maintenance page.
- `VITE_NHOST_FUNCTIONS_URL` — override functions endpoint.
- `VITE_SENTRY_TRACES_SAMPLE_RATE` / `VITE_SENTRY_REPLAY_SAMPLE_RATE`.

## Validation

- Run `npm run preflight:env` to validate required variables.
- CI runs `npm run preflight:example` to enforce `.env.example` coverage.
