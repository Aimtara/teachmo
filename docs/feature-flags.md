# Feature Flags and Environment Parsing

Teachmo client flags must be parsed through `src/config/env.ts`. Do not use
`Boolean(import.meta.env.FLAG)` for string environment values.

## Boolean parsing

- `true`, `1`, `yes`, `on` => `true`
- `false`, `0`, `no`, `off` => `false`
- empty/missing => configured default
- unexpected values throw when `strict: true`

## Production bypass policy

`production` and `staging` must never enable auth bypass flags:

- `VITE_E2E_BYPASS_AUTH`
- `VITE_BYPASS_AUTH`
- any client flag matching `VITE_*BYPASS*`

Run:

```bash
npm run check:production-auth-safety
```

## Current client flags

| Flag | Purpose | Production allowed? |
| --- | --- | --- |
| `VITE_NHOST_BACKEND_URL` | Nhost backend URL | Yes |
| `VITE_NHOST_SUBDOMAIN` / `VITE_NHOST_REGION` | Nhost project coordinates | Yes |
| `VITE_NHOST_FUNCTIONS_URL` | Optional functions endpoint override | Yes |
| `VITE_USE_GRAPHQL_EVENTS` | Select GraphQL events adapter | Yes, should be `true` |
| `VITE_USE_GRAPHQL_ACTIVITIES` | Select GraphQL activities adapter | Yes, should be `true` |
| `VITE_USE_GRAPHQL_CALENDAR` | Select GraphQL calendar adapter | Yes, should be `true` |
| `VITE_USE_GRAPHQL_MESSAGES` | Select GraphQL messaging adapter | Yes, should be `true` |
| `VITE_USE_SCOPED_THREAD_CREATE` | Use scoped Nhost function for thread create | Yes, should be `true` |
| `VITE_ENABLE_INTERNAL_ROUTES` | Enables internal routes outside dev | No unless explicitly approved for staging |
| `VITE_E2E_BYPASS_AUTH` | Playwright/test bypass only | No |
| `VITE_MAINTENANCE_MODE` | Maintenance screen kill switch | Yes |
| `VITE_SENTRY_DSN` | Public Sentry DSN | Yes |
| `VITE_SENTRY_TRACES_SAMPLE_RATE` | Sentry tracing sample rate | Yes |
| `VITE_SENTRY_REPLAY_SAMPLE_RATE` | Sentry replay sample rate | Yes |

