# Nhost Live Config Verification Evidence

Environment:
Reviewer:
Date:

## Checklist

- Project ID and dashboard URL match the intended staging/production project.
- Auth redirect/CORS allowlists contain only approved domains.
- Email verification, HIBP/password policy, and error-concealment settings match `docs/runbooks/nhost-production-config.md`.
- Anonymous/public DB access is disabled unless explicitly approved.
- Hasura admin secret and provider secrets are managed in the provider secret store, not repo files.

## Evidence

- Dashboard screenshots:
- Command output:
- Deviations:
- Decision: PASS / FAIL / ACCEPTED RISK
