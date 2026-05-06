# Privacy APIs and route policy manifest

Teachmo now has backend privacy APIs mounted at `/api/privacy` and a route
policy manifest in `backend/compliance/routePolicyManifest.js`.

## APIs

- `GET /api/privacy/consents/history` returns tenant-scoped consent history for
  the authenticated actor.
- `POST /api/privacy/consents` records scoped consent with version, notice,
  source, evidence reference, and audit event.
- `DELETE /api/privacy/consents/:scope` appends a revocation record instead of
  mutating history.
- `GET /api/privacy/relationships` lists tenant-scoped guardian/student
  relationships.
- `POST /api/privacy/relationships` creates an invited relationship request.
- `POST /api/privacy/relationships/:id/verify` requires an admin role and marks
  the relationship `school_verified`.
- `POST /api/privacy/relationships/:id/revoke` and `/dispute` update state and
  audit the transition.
- `POST /api/privacy/data-exports` creates a lifecycle export request after
  subject, admin, or verified guardian access checks.
- `POST /api/privacy/data-deletions` creates a lifecycle deletion request after
  the same access checks.

## Manifest rules

Sensitive routes must declare:

- method and path
- classified entity
- sensitive action
- required controls: auth, tenant, role/scope, relationship or subject access,
  consent validation where applicable, and audit

`backend/__tests__/complianceFoundations.test.js` fails if manifest entries lack
classification or required controls.
