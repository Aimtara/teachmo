# Messaging Delivery SLO

## Pilot SLO

- 95% of in-app messages are persisted and visible to recipients within 60 seconds.
- Failed notification deliveries are retried with bounded exponential backoff.
- Repeated failures are surfaced in admin troubleshooting dashboards and support queues.

## Required evidence

1. Queue/job run ID.
2. Message ID or redacted correlation ID.
3. Retry attempts and terminal state.
4. Admin-visible error summary.
5. No raw message body in logs or screenshots.

## Recovery

1. Confirm tenant and role scope.
2. Retry idempotently using the queue/run ID.
3. If retry fails, open support escalation with redacted correlation IDs.
