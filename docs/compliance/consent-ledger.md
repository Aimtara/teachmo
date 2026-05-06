# Consent ledger

Teachmo consent is scoped, versioned, and revocable. The helper implementation lives in `backend/compliance/consentLedger.js`; durable storage is scaffolded by `backend/migrations/20260506_compliance_foundations.sql`.

Required fields include `consent_id`, `actor_id`, `actor_role`, `student_id` or `child_id` where applicable, `school_id`, `tenant_id` or `organization_id`, `consent_scope`, `consent_status`, `consent_version`, `notice_version`, `source`, timestamps, and `evidence_ref`.

Consent scopes are separate for account creation, child data collection, school-authorized use, AI assistance, sensitive AI recommendations, messaging, weekly digest, optional analytics, third-party integrations, media/community display, and surveys/reflections.

Revocation never rewrites history. New processing must evaluate the latest matching ledger record and fail closed when consent is missing, expired, denied, or revoked.
