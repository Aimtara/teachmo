# Gate 3 Messaging / Digest / Assignments / Office Hours Proof

Use this packet for staging/pilot evidence. Do not paste message bodies, child names, prompt text, tokens, or vendor payloads.

| Field | Value |
| --- | --- |
| Environment |  |
| Tenant / school |  |
| Executor / reviewer |  |
| Date / build SHA |  |
| Feature flags |  |

## Automated pre-checks

| Check | Result | Artifact |
| --- | --- | --- |
| `npx vitest run src/domains/__tests__/messagingReliability.test.ts src/domains/__tests__/officeHours.test.ts` |  |  |
| Assignment dry-run helper executed with approved fixture |  |  |
| PII logging check |  |  |

## Messaging retry/idempotency proof

| Step | Expected | Actual | Evidence |
| --- | --- | --- | --- |
| Trigger retryable 429/503 or network failure in staging-safe queue | Retry scheduled with bounded backoff |  |  |
| Retry same client message/idempotency key | Duplicate send prevented |  |  |
| Trigger permanent 403/400 class error | No retry, status failed with sanitized reason |  |  |

## Digest proof

| Step | Expected | Actual | Evidence |
| --- | --- | --- | --- |
| Run daily digest for fixture user/window | One outbox row per user/window |  |  |
| Re-run same window | No duplicate sent digest |  |  |
| Mark failed outbox and re-run | Recovery resets/queues and records outcome |  |  |

## Assignments sync dry-run proof

| Step | Expected | Actual | Evidence |
| --- | --- | --- | --- |
| Dry-run fixture with exact external IDs | Ready status and valid counts |  |  |
| Dry-run fixture with missing/duplicate IDs | Needs-review status and redacted row errors |  |  |

## Office-hours proof

| Step | Expected | Actual | Evidence |
| --- | --- | --- | --- |
| Teacher creates availability | Timezone-safe slots visible |  |  |
| Parent books slot | Confirmed booking, audit event |  |  |
| Second user tries same slot | Conflict prevented |  |  |
| Cancel then reschedule | Old slot open, new slot booked |  |  |
| Non-authorized role attempts booking | Denied |  |  |

## Decision

- [ ] PASS for controlled pilot scope
- [ ] FAIL / hold
- Reviewer notes:
