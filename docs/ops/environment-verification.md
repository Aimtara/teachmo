# Environment Verification Automation

Generated: 2026-05-04

Teachmo verifies staging and production readiness with a repository script and
nightly/on-demand GitHub workflow. The automation is intentionally evidence-first:
it validates safe repository policy everywhere, then performs live checks only
when environment-specific secrets are available.

## Commands

```bash
npm run ops:env-verify
npm run ops:env-verify -- --target staging --require-live
```

Reports are written to `artifacts/ops/environment-verification.{json,md}` by
default.

## What the script checks

- Required target variables are present when live evidence is required.
- Nhost deployable config remains safe via the same policy as
  `check-nhost-config-safety.mjs`.
- Auth redirect URLs and CORS origins are explicit HTTPS URLs and never wildcard
  origins.
- Public/anonymous database access flags are not enabled.
- Email verification is required.
- HIBP breach checks and concealed auth errors are enabled.
- Hasura RBAC smoke prerequisites are present, and the live smoke script is
  invoked when endpoint and role JWTs are provided.

## CI behavior

Workflow: `.github/workflows/environment-verification.yml`

- Pull requests run repository/config validation without live secrets.
- Nightly scheduled runs target staging and require live evidence.
- Manual dispatch can target staging or production.
- Missing live secrets fail scheduled/manual protected runs rather than creating
  false evidence.
- Reports are uploaded as workflow artifacts.

## Required secrets for live mode

- `NHOST_CONFIG_EXPORT_JSON` or equivalent exported dashboard config.
- `STAGING_APP_URL` / `PRODUCTION_APP_URL`.
- `STAGING_API_URL` / `PRODUCTION_API_URL`.
- `HASURA_GRAPHQL_ENDPOINT`.
- `TEST_JWT_PARENT`, `TEST_JWT_TEACHER`, `TEST_JWT_PARTNER`,
  `TEST_JWT_ADMIN`, `TEST_JWT_OPS` where available.

## Evidence requirements

Attach the generated Markdown report to the appropriate readiness template:

- Staging Nhost: `docs/readiness/evidence/staging-nhost-verification-template.md`
- Production Nhost: `docs/readiness/evidence/production-nhost-verification-template.md`
- Hasura permissions: `docs/readiness/evidence/hasura-permissions-review-template.md`

