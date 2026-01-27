# Adding Events & Workflow Steps

## Add a new event type

1. **Schema**: Extend `calendar_events` or add a new table in `nhost/migrations/**/up.sql`.
2. **Metadata**: Update `nhost/metadata/**` with permissions for the new fields.
3. **Backend ingestion**:
   - If ingesting from external providers, wire adapters in `src/api/adapters` or serverless syncs under `nhost/functions`.
   - Normalize to common fields: `title`, `description`, `starts_at`, `ends_at`, `source`.
4. **Frontend**:
   - Surface in `src/components/calendar` or related views.
   - Update filters and labels as needed.

## Add a workflow step

1. **Workflow definition**: Add or update workflow models in `src/api/workflows`.
2. **Automation**:
   - Create a serverless handler in `nhost/functions/workflow-*`.
   - Keep idempotency via `dedupeKey` in notifications.
3. **Permissions**:
   - Add actions/scopes in `src/security/permissions` and `src/config/rbac`.
4. **UI**:
   - Update admin workflow screens in `src/pages/AdminWorkflows.jsx`.
   - Ensure required roles and scopes in `src/pages/index.jsx`.

## Validation checklist

- ✅ Schema migration applied and metadata exported.
- ✅ Unit tests for core workflow logic.
- ✅ E2E checks for role‑based routing and admin workflows.
