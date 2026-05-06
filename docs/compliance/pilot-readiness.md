# Pilot readiness checklist

Teachmo is not compliance-complete until these controls are implemented, tested,
reviewed, and operated with production evidence.

## P0 foundations now scaffolded

- Data classification registry and tests for core sensitive objects.
- Guardian/student relationship states and fail-closed access helpers.
- Consent ledger scopes, history, versioning, grants, and revocation helpers.
- RBAC/ABAC tenant, school, class, student, and admin policy helpers.
- PII redaction, safe logging, safe analytics, and unsafe logging scans.
- Tenant-scoped, PII-minimized audit event builder.
- Export, deletion, anonymization, and retention policy registry.
- Advisory-only AI governance, high-stakes review, PPRA detection, trace redaction.
- Compliance CI/report hooks for typecheck, auth bypass, scanners, and governance tests.
- Risky feature flags disabled by default.

## P1 pilot scaffolds

- Roster import preview with deterministic keys, duplicate detection, and review states.
- Directory request state machine that reveals no private school/student data before approval.
- Messaging delivery queue and retry state scaffolding with relationship/consent checks.
- Admin/privacy console APIs should read from consent, relationship, audit, lifecycle,
  AI review, incident, and feature flag tables.
- DSAR rehearsal should run export, deletion, consent revocation, backup-note, and
  audit-preserving anonymization paths.
- Incident workflow should create, triage, contain, investigate, notify-required,
  and resolve records without unnecessary PII.
- PPRA-sensitive prompts must be blocked unless approval, notice, and consent are present.

## District procurement evidence

- DPA and subprocessor list.
- No sale, no targeted advertising, and no noneducational profiling statement.
- Data classification coverage report.
- Hasura/GraphQL permission smoke results.
- Audit log taxonomy and export evidence.
- Deletion/export rehearsal evidence.
- AI governance evidence showing advisory-only output and human review.
- Accessibility smoke and WCAG review evidence.
- Incident response workflow evidence.
- Security scans, auth bypass checks, and secret scanning results.
