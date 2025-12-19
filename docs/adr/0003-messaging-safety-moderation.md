# ADR 0003 — Messaging Safety, Moderation, and Risk Controls

- **Status:** Proposed (ready to adopt)
- **Date:** 2025-12-19
- **Owners:** Product + Engineering + Trust/Safety
- **Applies to:** messaging schema + UI + moderation workflow

## Context

Messaging between parents and school staff is one of Teachmo’s highest-value features—and highest-risk:

- sensitive child info can be shared
- harassment or inappropriate content may occur
- schools need audit trails, escalation, and retention controls
- moderation must be careful, explainable, and privacy-aware

Teachmo needs a consistent safety architecture that works for Phase 1 pilots and can scale.

## Decision

Teachmo adopts a tiered safety model:

- Prevent (guardrails + friction for risky actions)
- Detect (automated flags + heuristics)
- Respond (moderation queue + escalation)
- Audit (immutable logs of sensitive actions)

Messaging remains usable and “human,” but safety is a system.

### Canonical messaging model

Entities:

- message_threads
- message_thread_participants
- messages
- message_reports (optional Phase 1)
- moderation_actions (Phase 2)
- audit_log

Thread types:

- parent_teacher_1to1
- class_channel (Phase 2)
- admin_support
- partner_support (optional, isolated)

### Guardrails (Prevent)

**High-risk actions require re-auth / confirmation**

- adding participants
- initiating thread to staff not linked to a child context
- sending attachments (Phase 2)
- exporting or copying long transcripts (Phase 2)

**Context requirement for parent/teacher messaging**

A parent may message a teacher only if:

- there exists an active student_enrollment connecting the parent’s child to teacher’s classroom/section
- OR an admin explicitly creates a thread for them (with audit log)

**Rate limits**

Per-user limits (enforced server-side):

- messages per minute
- new threads per hour
- report submissions per day

### Detection (Automated + Heuristics)

**Message fields**

Messages include:

- body
- created_at, sender_user_id
- risk_level (enum: low, medium, high, blocked)
- flag_reasons (array: PII, self_harm, threat, sexual_content, hate, harassment, medical, legal, unknown)
- moderation_status (enum: clean, flagged, hidden, removed, needs_review)
- redacted_body (optional; see ADR 0004)

**Detection approach**

Phase 1:

- lightweight heuristic + keyword + pattern checks (PII, threats, harassment markers)
- optional AI classifier only for medium/high risk (minimize data exposure)

Phase 2:

- multi-provider classifier with audit trail:
  - model provider
  - model version
  - confidence scores
  - reason codes

### Response (Moderation workflow)

**Moderate by role**

- School admins can review flagged content in their school scope.
- District admins can review org-wide.
- Super admins only for break-glass.

**Moderation queue behavior**

- risk_level=high → message is soft-hidden to recipients pending review (sender sees “sent—under review”)
- risk_level=medium → visible but flagged for review
- risk_level=blocked → prevented from sending, user gets a gentle explanation + safer alternatives

**Actions**

Moderators can:

- mark as clean
- redact sensitive details
- warn user (templated)
- restrict user messaging temporarily
- escalate to school/district support
- export thread for compliance (Phase 2)

### Audit (Immutable logging)

Log these events to audit_log:

- thread created (who/what context)
- participants added/removed
- moderation status changes
- any admin read/export action (Phase 2)
- any user restrictions imposed

Audit logs include:

- actor_user_id
- action_type
- target_entity + id
- timestamp
- school_id/org_id
- metadata (JSON, minimal PII)

### UX requirements (safety without panic)

- No scary language by default.
- Explain “why” when blocking: “This looks like it may include private student info; try removing names/addresses.”
- Provide “words to try” scripts aligned to Teachmo brand.
- Offer “report message” and “request admin help” affordances.

## Consequences

- Requires new moderation UI for admins (even minimal).
- Requires server-side enforcement (not only UI).
- Requires retention/redaction rules (see ADR 0004).

## Follow-ups / Implementation tasks

- Implement message context checks (parent↔teacher via child enrollment).
- Add moderation fields to schema and enforce safe defaults.
- Create admin moderation queue page (MVP: filter flagged threads/messages).
- Add rate limiting (API gateway, edge function, or backend service).
