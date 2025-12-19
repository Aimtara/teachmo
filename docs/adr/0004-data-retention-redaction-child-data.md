# ADR 0004 — Data Retention + Redaction Defaults for Child-Related Data

- **Status:** Proposed (ready to adopt)
- **Date:** 2025-12-19
- **Owners:** Product + Engineering + Privacy/Compliance
- **Applies to:** database policies, jobs, exports, DSAR, incident response

## Context

Teachmo handles child-adjacent data in a K–12 context. Default data retention must balance:

- privacy and minimization
- utility (longitudinal engagement insights)
- school compliance expectations
- the reality of pilot operations (support + debugging)

Retention should be:

- explicit
- implementable
- configurable per org/district
- enforced automatically (not “policy only”)

## Decision

Teachmo adopts a default retention policy of 365 days for child-related operational content, with redaction-first behavior for sensitive message data where appropriate.

### Default: 365 days with redaction

- Keep records needed for product continuity and accountability.
- After retention window, delete or irreversibly anonymize.
- For content categories that create higher risk, apply earlier redaction.

### Data classification

Teachmo data is classified into buckets with separate policies:

**A) Child PII / identifiers (highest sensitivity)**

Examples:

- child name, DOB, student ID, address, guardian link data

Policy:

- retained while enrollment/relationship is active
- on removal, convert to tombstone/anonymized identifiers within 30–90 days (org configurable)
- strict access controls (RBAC/ABAC + column-level permissions)

**B) Messaging content (high sensitivity)**

Examples:

- message bodies between parent and staff

Policy:

- retain up to 365 days by default
- apply automated PII redaction to “stored long-term” representation where feasible:
  - store original body during active window
  - store redacted_body (PII removed) for analytics/trends beyond window
- allow districts to set a shorter period (e.g., 90/180 days)

**C) Engagement metadata (medium sensitivity)**

Examples:

- “completed activity,” “opened digest,” “attendance at event”

Policy:

- retain 365 days (or longer if anonymized)
- may be aggregated beyond retention window (counts only, no identifiers)

**D) Audit logs (compliance-critical)**

Examples:

- role changes, guardian verification actions, moderation actions, exports

Policy:

- retain minimum 2 years default (org configurable)
- store minimal PII, prefer hashed identifiers where possible
- immutable append-only

**E) Support artifacts (screenshots, attachments) (Phase 2)**

Policy:

- short retention (30–90 days) unless explicitly required
- never store without explicit consent/need

### Enforcement mechanism

Retention is enforced via scheduled jobs:

- nightly job per org
- deletes or anonymizes records past TTL
- writes an audit event summarizing retention actions (counts, no PII)

Implementation options:

- Nhost scheduled functions / cron
- external worker
- Hasura scheduled events (if applicable)

### DSAR / deletion requests

Teachmo supports:

- delete parent account
- sever guardian link
- delete child profile (if legally allowed; may require school admin approval)
- export user data in structured form (Phase 2)

Rules:

- DSAR deletions do not erase audit logs, but logs must minimize PII.
- Where “deletion not permitted” (school-managed records), convert to restricted state and deny future processing.

### Consent + legal holds (district option)

- District admins can place a legal hold on specific records (e.g., incident investigations)
- Holds override automated deletion until released
- Holds are auditable

## Consequences

- Requires redaction pipeline for messages (even basic).
- Requires retention job infrastructure.
- Requires per-org configurable settings UI (Phase 2; can be config file/env for pilot).

## Follow-ups / Implementation tasks

- Define canonical retention config structure:
  - retention.messaging_days
  - retention.engagement_days
  - retention.audit_days
  - retention.child_pii_grace_days
- Add DB indexes to support efficient retention purges.
- Implement redacted_body and a lightweight redaction pass (regex + pattern matching for emails/phones/addresses; expand later).
- Add admin settings page for retention (Phase 2); for pilot, set defaults via org config.
