# Assignments Sync v0 Runbook

## Scope

The launch-safe v0 supports mock/dry-run or provider-scoped sync evidence until
district LMS credentials are available.

## Dry-run checklist

1. Select provider and tenant scope.
2. Run sync in dry-run mode.
3. Verify returned status, idempotency key, item counts, and redacted errors.
4. Confirm no raw student assignment content is logged.
5. Promote to live sync only after LMS credentials and district approval exist.

## Failure recovery

- Retry only idempotent sync keys.
- Mark repeated provider/auth failures as manual remediation.
- Attach sync status, provider, tenant, and error class to support ticket.
