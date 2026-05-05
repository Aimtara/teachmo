# Gate 2 Directory / Import / Identity Proof Template

## Scope

- Environment:
- Tenant/school:
- Executor:
- Reviewer:
- Date:

## Required proof

| Case | Expected | Actual | Evidence |
| --- | --- | --- | --- |
| CSV/OneRoster-lite dry run does not mutate roster rows | `dryRun: true`, `inserted: 0` |  |  |
| Exact external ID match | `match` / `exact_external_id` |  |  |
| Scoped email match | `match` / `school_scoped_email` when policy allows |  |  |
| Guardian/student relationship | `match` / `guardian_student_relationship_key` |  |  |
| Conflict/manual review | `manual_review`, no silent merge |  |  |
| Invalid/duplicate row | row-level redacted warning |  |  |
| Approve/reject with reason | decision reason captured and audited |  |  |
| PII-safe logs | names/emails/message bodies absent or redacted |  |  |

## Attachments

- Import preview output:
- Audit event:
- Screenshot/log:
- Reviewer signoff:
