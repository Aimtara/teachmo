# Nhost Production Configuration Runbook

## Automated checks

Run before any deploy:

```bash
npm run check:secret-hygiene
npm run check:nhost-config-safety
npm run check:hasura-readiness
```

`nhost/nhost.toml` is the deployable, safe-by-default config. `nhost/nhost.local.example.toml`
is local-only and must not be promoted to staging or production.

## Production/staging requirements

- CORS must list exact staging/production domains; no wildcard origins.
- Hasura dev mode and console are disabled.
- Hasura allowlist is enabled.
- Postgres public access is disabled.
- Anonymous auth is disabled unless Product/Security approves a dated exception.
- Email/password requires email verification.
- HIBP password breach checks and concealed auth errors are enabled.
- OAuth client secrets are configured only in Nhost dashboard/secret manager.
- Google OAuth secret exposed before 2026-05-03 must be rotated before pilot traffic.

## Manual evidence

Capture the following for staging and production:

1. Nhost project ID and environment.
2. Screenshot/export of Hasura settings listed above.
3. Screenshot of auth provider with secret value hidden.
4. Secret rotation ticket/evidence for Google OAuth.
5. `npm run check:production:fast` output from the release commit.
