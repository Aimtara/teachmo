# Security, Privacy, and Compliance Guidelines

This document defines the minimum controls Teachmo must implement to protect learner, parent, educator, and partner data. It is intended for engineers, operators, and compliance stakeholders.

## Transport and Data Protection
- **Transport security:** All external and internal service endpoints MUST enforce TLS 1.3 with modern cipher suites. Certificates must be issued by trusted authorities or platform-managed services.
- **Encryption at rest:** Use AES-256 for database, blob/object storage, and backup encryption. Managed services (e.g., RDS, KMS, Vault) should be configured for customer-managed keys.
- **Key management:** Keys must be rotated at least every 90 days or immediately after a suspected compromise. Use automated rotation policies where available and maintain auditable key usage logs.
- **Secure coding practices:** Follow the OWASP Top 10 (2021) for all services. Require input validation, output encoding, parameterized queries, CSRF protections on state-changing requests, dependency scanning, and least-privilege IAM for CI/CD secrets.
- **Security assurance:** Run regular penetration tests (at least annually and after major releases) plus continuous vulnerability scanning. Track and remediate findings with due dates.

## Access Controls and Data Segmentation
- **Role- and context-based permissions:**
  - Parents/guardians can only access their own child(ren)'s records and may not view other families' data.
  - Teachers can only access data scoped to the classes they teach (e.g., roster, assignments, and assessments for their sections).
  - Partners have access only to aggregated, anonymized datasets by default. Individual-level data requires explicit, revocable consent that is logged with timestamp, scope, and duration.
- **Isolation controls:** Enforce tenant- or family-level scoping in every query and API response. Deny by default and require explicit authorization checks per route/service.
- **Auditability:** Log access decisions (subject, resource, action, decision, reason) and retain them per compliance policy to support investigations and consent tracking.

## Data Subject Rights (FERPA, COPPA, GDPR)
- **Data export:** Provide user-facing tools to export a complete, machine-readable copy of a user's personal data (student, parent, teacher, partner) along with metadata on processing purposes and data recipients.
- **Data deletion:** Offer authenticated deletion/erasure flows that remove personal data across primary databases, caches, and backups within documented retention periods. Provide status tracking and confirmations.
- **Parental consent:** Collect and record verifiable parental consent for minors. Surface consent status in account and admin views to govern feature access.
- **Retention:** Apply data minimization with default retention schedules and documented legal bases for any exceptions.

## AI Transparency and Controls
- **Model explainability:** Document AI model purposes, inputs, outputs, training data provenance, evaluation metrics, and known limitations. Make decision logs available for audits where applicable.
- **Opt-out:** Allow users to opt out of AI-driven personalization while maintaining a baseline, non-personalized experience. The opt-out state must propagate to recommendation, notification, and analytics pipelines.
- **Governance:** Review AI models for bias and privacy risks before deployment. Maintain versioned model cards and changelogs.

## Operational Requirements
- **Change management:** Security-impacting changes must undergo peer review, automated testing, and rollout plans with monitoring/rollback steps.
- **Incident response:** Maintain runbooks for detection, triage, containment, eradication, and recovery. Post-incident reports should document root causes and follow-up actions.
- **Third-party risk:** Inventory third-party processors, ensure DPAs are in place, and review their SOC 2/ISO 27001 reports annually.

## Implementation Checklist
- Enforce TLS 1.3 everywhere; disable legacy TLS/SSL.
- Enable AES-256 encryption for databases, object storage, and backups; store keys in a managed KMS with 90-day rotation.
- Add centralized authorization middleware enforcing family/class scoping and consent-aware partner access.
- Build export/deletion workflows with user-facing status and audit logs; cover primary stores and backups.
- Provide AI model documentation, decision logging, and opt-out toggles that bypass personalization while keeping core functionality.
- Schedule quarterly vulnerability scans and annual penetration tests; track remediation SLAs.
