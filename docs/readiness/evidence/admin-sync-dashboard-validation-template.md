# Admin Sync and Dashboard Validation Evidence Template

Status: `[ ] pending` `[ ] pass` `[ ] fail` `[ ] waived`

## Metadata

- Environment:
- Tenant / district:
- Executor:
- Reviewer:
- Date/time:
- Build SHA:

## Admin sync-now proof

| Step | Expected | Actual | Evidence link |
| --- | --- | --- | --- |
| Sign in as admin/system_admin | Access granted |  |  |
| Start dry-run sync | Job accepted; no writes |  |  |
| Start real sync-now | Job accepted; status visible |  |  |
| Non-admin attempts sync-now | Denied or redirected |  |  |
| Troubleshooting panel shows status/error | Error is actionable and PII-safe |  |  |
| Audit event review | Actor, action, status, reason/job ID recorded |  |  |

## Dashboard validation

| Dashboard | Source-of-truth comparison | Expected | Actual | Evidence link |
| --- | --- | --- | --- | --- |
| Adoption | Compare event/user counts | Matches within accepted tolerance |  |  |
| Delivery | Compare notification/message delivery counts | Matches source rows/events |  |  |
| Sync health | Compare integration job table/status | Latest status and stale indicators match |  |  |

## PII and export checks

- [ ] No raw student/guardian names in aggregate dashboards unless role-permitted.
- [ ] Exports are scoped by tenant/role.
- [ ] Logs/events redact message bodies, prompts, tokens, emails, phone numbers, and addresses.

## Decision

- Result:
- Follow-ups:
- Owner:
- Target date:
