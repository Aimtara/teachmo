# Gate 4 Admin / Analytics / Command Center Proof Template

Use this packet for staging or production Gate 4 proof. Do not paste raw PII, secrets, bearer tokens, cookies, or full vendor payloads.

## Run metadata

| Field | Value |
| --- | --- |
| Environment |  |
| Base URL |  |
| Build SHA |  |
| Executor / reviewer |  |
| Timestamp |  |

## Proof checklist

| Target | Required evidence | PASS / FAIL / BLOCKED | Artifact |
| --- | --- | --- | --- |
| Admin sync-now | Trigger sync-now or approved dry-run and capture status/result/error output. |  |  |
| Troubleshooting visibility | Show sync health, last run, next action, and sanitized error details. |  |  |
| Non-admin denial | Attempt admin/control-plane route/action as non-admin and capture 403/redirect. |  |  |
| Analytics reconciliation | Reconcile adoption, delivery, and sync counts against source events/fixtures. |  |  |
| Command Center approval | Create/approve/execute/cancel or escalate an action with reason where applicable. |  |  |
| Audit trail | Attach redacted audit/event rows with actor, action, status, entity, and timestamps. |  |  |

## Reviewer decision

- Decision:
- Residual risk accepted:
- Follow-up owner/date:
