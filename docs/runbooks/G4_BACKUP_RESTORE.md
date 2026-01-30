# G4 Backup & Restore Runbook

## Backup cadence

- Schedule database backups in Nhost/Hasura at least daily.
- Store offsite backups for disaster recovery.

## Validate backups

- [ ] Verify the latest backup timestamp.
- [ ] Confirm backup integrity (checksum or provider verification).

## Restore drill (non-production)

1. Restore the latest backup into a staging project.
2. Run smoke tests (auth, role redirects, primary dashboard).
3. Document time-to-restore and gaps.

## Emergency restore (production)

1. Enable maintenance mode (`VITE_MAINTENANCE_MODE=true`).
2. Restore from the latest good backup.
3. Validate `/healthz` and core flows.
4. Disable maintenance mode.
