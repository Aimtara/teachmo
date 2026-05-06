# Remaining gaps and remediation plan

Teachmo has compliance foundations in code, but the platform is not compliance-complete.
The source of truth for open gaps is `backend/compliance/remediationBacklog.js`.

## P0 gaps to close before expanding child/student data creation

| Gap | Risk | Recommendation | Solution |
| --- | --- | --- | --- |
| Route-by-route server-side enforcement | Direct API/function paths could bypass UI-only controls. | Inventory every sensitive Express route, Nhost function, and GraphQL operation. | Add handler policy metadata and CI coverage that requires classification, tenant, relationship, consent, and audit enforcement. |
| Hasura and GraphQL permission proof | Hasura row/column permissions can drift and leak cross-tenant records. | Treat Hasura metadata as the data-plane source of truth. | Add role fixtures and negative GraphQL permission smoke tests for parent, teacher, school admin, district admin, and anonymous roles. |
| Consent ledger API and privacy preference center | Child data could be collected or used without scoped, revocable consent. | Ship preferences before AI, messaging, analytics, integrations, surveys, or media/community display. | Add consent grant/revoke/history APIs and accessible privacy-center controls per consent scope. |
| Guardian relationship operations | Parents/guardians could access data before verification or after revocation. | Make verification a prerequisite for every guardian-facing student route. | Add relationship lifecycle APIs for invite, school verification, guardian confirmation, revocation, dispute, and immediate access invalidation. |
| DSAR/export/deletion rehearsal | Support cannot prove access/export/deletion obligations. | Add one command that rehearses export, deletion, consent revocation, backup notes, and audit-preserving anonymization. | Seed representative records and emit a redacted DSAR rehearsal report. |
| AI governance route integration | Non-completion AI paths could skip consent, redaction, or human review. | Apply advisory-only, consent, redaction, retention, and review rules to every AI path. | Inventory orchestrator/Nhost AI jobs and route all prompt/output writes through governed trace handling. |
| Accessibility beyond smoke coverage | Privacy/security actions may be inaccessible. | Test critical consent, guardian approval, export/deletion, messaging, AI review, and admin flows. | Add Playwright/aXe keyboard, focus, label, error, dialog, and AI/chat semantic tests plus manual WCAG evidence. |

## P1 pilot gaps

| Gap | Recommendation | Solution |
| --- | --- | --- |
| Admin privacy/compliance console | Give school/district admins compliance visibility without engineering help. | Add tenant-scoped summary/detail APIs for consent, relationships, roster imports, messaging health, audit logs, lifecycle requests, AI review, incidents, integrations, release gates, and accessibility evidence. |
| Messaging and digest reliability | Re-check privacy authorization immediately before enqueue and send. | Centralize delivery authorization, suppression, retry/backoff, dead-letter visibility, redacted templates, and sent/read/delete/suppressed audit events. |
| Roster import production workflow | Make roster import reviewed, deterministic, and auditable. | Persist previews, detect duplicates/cross-tenant collisions, quarantine ambiguous rows, and support rollback references. |
| Incident and breach response operations | Scope affected tenants/subjects/data classes without unnecessary PII. | Add incident APIs, affected-subject export, audit preservation, and notice placeholders with legal-review disclaimers. |
| Procurement and vendor evidence packet | Connect automated evidence to district procurement artifacts. | Maintain owners/status for DPAs, subprocessors, no-sale/no-targeting statements, deletion/export, security scans, a11y, AI governance, and incident response evidence. |

## Recommended sequencing

1. Close `GAP-001` and `GAP-002` before enabling more student-data routes.
2. Close `GAP-003` and `GAP-004` before guardian dashboards, messaging, AI insights, exports, or deletion self-service.
3. Close `GAP-007` before any student-sensitive AI recommendation.
4. Close `GAP-005` before district pilot support commitments.
5. Close `GAP-010` alongside any privacy/security UI launch.
6. Close P1 gaps before broad school/district pilot expansion.

## Evidence expectations

- Every closed gap needs automated tests, a redacted artifact, or a documented manual evidence packet.
- Every exception needs an owner, expiration, compensating control, and release approval.
- No item in this plan is a legal compliance guarantee; legal/vendor/procurement review remains separate.
