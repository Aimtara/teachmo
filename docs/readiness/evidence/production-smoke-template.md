# Production Smoke Evidence Template

Status: [ ] planned [ ] in progress [ ] complete [ ] failed

## Scope
- Environment:
- Release SHA:
- Date/time:
- Tester:
- Required access: production test users for parent, teacher, partner, admin, ops/system_admin.

## Checks
- `/healthz` returns expected SHA and app env.
- Auth/login/password reset or passwordless flow works with production redirect URLs.
- Parent dashboard loads and cross-tenant child data is forbidden.
- Teacher dashboard/classes/assignments load.
- Partner dashboard/submissions load.
- Admin dashboard loads only for admin role.
- Ops/system_admin routes reject non-ops users.
- Messaging route sends/receives test message without raw PII in logs.
- Discover/explore route loads.
- Onboarding route works for a designated test account.
- Maintenance mode dry run preserves `/healthz`.

## Evidence Required
- Screenshots or terminal output for every check.
- Hasura permission smoke artifact.
- Sentry release/error-free window screenshot.
- Any incident/rollback notes.

## Result
- Pass/fail:
- Follow-ups:
