# Audit Event Taxonomy

Teachmo treats sensitive child, student, family, school, AI, lifecycle, and admin actions as audit-required by default.

Code:
- `backend/compliance/auditEvents.js`
- `backend/utils/audit.js`
- `backend/security/audit.js`

Minimum categories covered:
- auth/security-sensitive events
- guardian relationship create/verify/revoke/dispute/access denial
- consent grant/revoke
- student view/export/delete
- roster import/modify
- message send/read/delete
- AI prompt/output/recommendation review/override
- admin access to student/family/school data
- tenant/school/class role changes
- integration enablement
- export/deletion request lifecycle
- incident create/update
- feature flag updates

Audit records must be tenant-scoped and PII-minimized. Raw child/student/family PII belongs in source systems with lifecycle policy, not in audit metadata.
