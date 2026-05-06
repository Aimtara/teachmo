# Data lifecycle

Teachmo lifecycle controls are defined in `backend/compliance/dataLifecycle.js`.

## Behaviors

- `requestDataExport(actor, subject, scope)` fails closed unless the actor is the subject, a scoped admin, or has verified student access.
- `generateDataExport(requestId)` produces a redacted package covering account, relationship, student, roster, message, assignment, AI, consent, and audit-summary data where supplied.
- `requestDataDeletion(actor, subject, scope)` uses the same authorization rule as export.
- `processDataDeletion(request)` preserves audit integrity and blocks when legal hold or contract retention is present.
- `anonymizeSubjectData(subjectId)` removes direct identifiers while preserving subject/audit references.

## Retention notes

Audit and consent records are preservation-oriented evidence. Subject deletion must minimize identifiers without destroying required audit integrity.
