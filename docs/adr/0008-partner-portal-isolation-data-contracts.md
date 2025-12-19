# ADR 0008 — Partner Portal Isolation & Data Contracts

- **Status:** Proposed (ready to adopt)
- **Date:** 2025-12-19
- **Owners:** Product + Engineering
- **Applies to:** Partner portal, submissions, approvals, analytics

## Context

Teachmo’s partner ecosystem is a growth lever and a risk surface. Partners must contribute value without accessing child data, operate under approval and audit, and only see aggregated impact. The partner portal must be architecturally isolated, not just permissioned.

## Decision

Treat the Partner Portal as a logically separate product surface with strict data contracts, no joins to child tables, explicit approval workflows, and read-only analytics aggregates.

## Data Isolation Rules

Partners never read from children, guardian_links, messages, or classrooms. They interact only with partner_submissions, partner_events, partner_resources, approval_records, and partner_analytics_aggregates. Partner-facing analytics are aggregated, delayed if necessary, and anonymized.

## Approval Workflow (Mandatory)

Every partner submission follows Draft → Submitted → Admin Review → Approved/Rejected → Published (if approved). Each transition is role-gated, writes to audit log, and is timestamped.

## Contracts & Schemas

Partner-facing APIs are versioned, expose only documented fields, and are validated on write. Breaking changes require a version bump and partner notice.

## Analytics for Partners

Partners may see impressions, saves/bookmarks, registrations (counts only), and completion rates (if applicable). They may not see identities, messages, raw feedback text, or school comparisons unless explicitly allowed.

## UX Boundaries

Partner UI uses distinct navigation, no crossover links to parent/teacher surfaces, clear labeling (“Partner Portal”), and separate onboarding and support flows.

## Consequences

- Strong compliance posture
- Clear value proposition to partners
- Reduced legal exposure
- Cleaner internal architecture

## Follow-ups

- Finalize partner schema
- Implement approval state machine
- Create partner analytics aggregate jobs
- Document partner API contracts
