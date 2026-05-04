# Messaging / Digest Retry Proof Evidence Template

Use this packet for Gate 3 E14/E15 staging or production rehearsals.

## Metadata

- Environment:
- Executor:
- Reviewer:
- Date/time:
- Build SHA:
- Tenant / organization:
- Messaging channel(s):

## Messaging delivery retry proof

| Step | Expected result | Actual result | Evidence link / screenshot | Pass/fail |
| --- | --- | --- | --- | --- |
| Send a test message with an idempotency key | Message is queued once |  |  |  |
| Simulate/transiently force a delivery failure | Failure class is recorded without raw message body/PII in logs |  |  |  |
| Retry worker/backoff runs | Retry count, next-at, and status advance deterministically |  |  |  |
| Successful retry completes | Final status is delivered and duplicate deliveries are not created |  |  |  |
| Permanent failure path | Permanent failure stops retries, emits alertable event, and preserves redaction |  |  |  |

## Digest reliability proof

| Step | Expected result | Actual result | Evidence link / screenshot | Pass/fail |
| --- | --- | --- | --- | --- |
| Trigger digest dry-run for a test cohort | Preview is deterministic and PII-safe |  |  |  |
| Trigger scheduled digest send | One digest per intended recipient |  |  |  |
| Re-run with same window/idempotency key | No duplicate digest is sent |  |  |  |
| Force transient send failure | Retry/recovery produces a single final digest |  |  |  |
| Inspect observability | Metrics include success/failure/retry counts and no raw body content |  |  |  |

## Signoff

- Result: PASS / FAIL
- Blockers:
- Follow-up owner:
- Follow-up due date:
