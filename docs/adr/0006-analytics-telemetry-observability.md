# ADR 0006 — Analytics, Telemetry & Observability Architecture

- **Status:** Proposed (ready to adopt)
- **Date:** 2025-12-19
- **Owners:** Product + Engineering + Ops
- **Applies to:** Frontend, backend, AI flows, admin dashboards, pilots

## Context

Teachmo’s success depends on measurable outcomes: parent activation and retention, messaging engagement, AI usefulness, school-level participation, and compliance visibility. Current analytics and telemetry are implicit and ad hoc, which is insufficient for pilots and enterprise readiness. Teachmo needs structured observability rather than opportunistic logging.

## Decision

Teachmo adopts a three-layer observability model with distinct data rules, retention, and audiences:

- Product Analytics — what users do
- Operational Telemetry — what the system does
- Compliance & Audit Signals — what must be provable

Analytics SDKs must be wrapped behind a Teachmo-owned interface (`src/lib/analytics.ts`).

## Layer 1 — Product Analytics (User Behavior)

**Purpose:** Understand engagement, friction, and value without surveilling families.

**Principles**

- Event-based, not session replay
- Minimal PII
- Aggregation-first
- Opt-out respected where required

**Canonical events (examples)**

- onboarding_completed
- child_profile_created
- daily_tip_viewed
- activity_saved
- message_sent
- thread_created
- ai_recommendation_accepted
- ai_recommendation_dismissed
- school_request_submitted

Each event includes: event_name, timestamp, user_role, org_id, school_id (if applicable), surface (dashboard, explore, ai, messaging), and metadata (small, non-PII JSON).

**Explicitly excluded**

- message bodies
- child names
- free-text inputs
- AI prompt content

## Layer 2 — Operational Telemetry (System Health)

**Purpose:** Detect failures before users report them.

**Tracked signals**

- auth failures
- permission denials
- API error rates
- latency by domain (auth, messaging, explore, AI)
- background job success/failure (retention, moderation)

**Requirements**

- Correlatable via request/session ID
- Role-aware (parent vs teacher failures matter differently)
- Environment-scoped (local/staging/prod)

## Layer 3 — Compliance & Audit Signals

**Purpose:** Prove correct behavior after the fact.

**Signals include**

- role changes
- guardian link verification
- moderation actions
- data exports
- retention deletions
- legal holds applied/removed

These signals go to immutable audit logs, are not part of product analytics, and have longer retention (see ADR 0004).

## Tooling Strategy (Non-Prescriptive)

Teachmo avoids hard-coding a vendor. Examples:

- Product analytics: PostHog / Amplitude / Segment-style interface
- Error tracking: Sentry-class
- Logs: structured JSON logs (backend + jobs)
- Admin dashboards: internal queries + aggregates

## Consequences

- Adds implementation work up front
- Prevents blind pilots
- Enables data-backed district conversations
- Reduces anecdotal decision-making

## Follow-ups

- Define canonical event schema
- Implement analytics wrapper
- Add pilot dashboards (basic)
- Document privacy posture for analytics
