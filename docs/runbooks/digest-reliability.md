# Digest Reliability Runbook

## Purpose

Use this runbook when weekly/daily digest generation, delivery, or tracking falls behind.

## Detection

- Scheduled workflow failure in GitHub Actions or job scheduler.
- Notification delivery error rate above SLO.
- Parent digest not generated for an eligible student/guardian.

## Triage steps

1. Confirm the scheduler ran for the expected tenant/time window.
2. Check duplicate-prevention state (`last_sent`, idempotency key, digest run ID).
3. Review notification queue retry/dead-letter rows.
4. Re-run in dry-run mode first; verify recipient counts without sending.
5. Re-run the affected digest ID only after confirming no duplicate delivery.

## Evidence for pilot

- Digest run ID.
- Eligible recipient count.
- Sent/skipped/failed counts.
- Retry/dead-letter count.
- Recovery action and owner.
