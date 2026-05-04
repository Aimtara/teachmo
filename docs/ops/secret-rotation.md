# Secret Rotation Automation

Teachmo secret rotation is approval-gated and dry-run-first. It covers Google
OAuth secrets and other provider secrets that are exposed through Nhost, Google,
or deployment-provider settings.

## Commands

```bash
npm run ops:secret-rotation -- --target staging --secret google-oauth-client-secret
npm run ops:secret-rotation -- --target staging --secret google-oauth-client-secret --execute
```

Dry-run mode creates an approval packet without calling provider APIs. Execution
mode requires:

- `--execute`
- `SECRET_ROTATION_APPROVED=true`
- `ROTATION_REQUEST_ID`
- target-specific provider secrets, for example:
  - `GOOGLE_OAUTH_CLIENT_ID`
  - `GOOGLE_ROTATION_CREDENTIALS_JSON`
  - `NHOST_ADMIN_TOKEN`
  - `NHOST_PROJECT_ID`

The script redacts all secret-like values in JSON/Markdown reports.

## GitHub workflow

`.github/workflows/secret-rotation.yml` is manually dispatched. It has two jobs:

1. **prepare**: dry-run inventory and approval summary.
2. **execute**: protected by a GitHub environment named after the target. This
   job only runs when the dispatch input `execute` is `true` and the environment
   reviewer approves it.

Production rotations require the `production` environment reviewers to approve
the job before any provider mutation can run.

## Evidence

Attach the workflow artifact to the relevant readiness evidence template:

- OAuth: `docs/readiness/evidence/oauth-secret-rotation-template.md`
- Auth redirects/login proof:
  `docs/readiness/evidence/staging-nhost-verification-template.md`

Evidence must include executor, reviewer, target, secret name, old-secret
revocation confirmation, post-rotation login proof, timestamp, and pass/fail
decision. Do not include the secret value.
