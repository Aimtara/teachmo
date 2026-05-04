# Backup/Restore and Rollback Automation

Generated: 2026-05-04

Teachmo now includes approval-gated automation for staging/disposable backup
restore drills and dry-run rollback rehearsals.

## Commands

```bash
npm run ops:backup-restore -- --output-dir artifacts/ops
npm run ops:backup-restore -- --execute --target staging \
  --source-url "$STAGING_DATABASE_URL" \
  --restore-url "$DISPOSABLE_RESTORE_DATABASE_URL"

npm run ops:rollback -- --target staging --current-ref "$GITHUB_SHA" --previous-ref "$PREVIOUS_DEPLOY_REF"
npm run ops:rollback -- --execute --approval APPROVED --target production
```

## Backup/restore behavior

- Dry-run mode records prerequisites and does not connect to databases.
- Execution mode requires `--execute`, `--source-url`, and `--restore-url`.
- The script uses `pg_dump`, restores to the disposable target with `psql`, and
  compares public schema table row counts before/after restore.
- Database URLs are redacted in reports.
- Production execution must run through the protected `production-data-operations`
  GitHub Environment.

## Rollback behavior

- Dry-run mode records current/previous refs and required evidence.
- Execution mode requires `--execute --approval APPROVED`.
- Provider deployment steps are intentionally controlled by environment variables:
  - `ROLLBACK_DEPLOY_PREVIOUS_COMMAND`
  - `ROLLBACK_SMOKE_COMMAND`
  - `ROLLBACK_DEPLOY_CURRENT_COMMAND`
- If provider commands are missing in execution mode, the workflow fails closed
  rather than pretending rollback succeeded.

## CI workflow

`.github/workflows/backup-restore-rollback.yml` runs:

- weekly staging/disposable backup restore,
- manual staging backup restore,
- manual production backup restore with environment approval,
- rollback dry-runs or executions with approval.

Reports are uploaded as workflow artifacts and should be attached to:

- `docs/readiness/evidence/backup-restore-drill-template.md`
- `docs/readiness/evidence/rollback-drill-template.md`
