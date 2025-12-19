# ADR 0001 — Teachmo Repo Architecture Baseline (Phase 1 → Phase 2)

- **Status:** Proposed (ready to adopt)
- **Date:** 2025-12-19
- **Owners:** Product + Engineering (Teachmo core)
- **Applies to:** teachmo-main repo, Phase 1 pilot & Phase 2 enterprise hardening

## Context

Teachmo currently contains (or has contained) multiple architectural "tracks" in the same codebase:

- Frontend: Vite + React 18 + Tailwind/shadcn/Radix, large multi-role UI surface.
- Backend options:
  - Nhost + Hasura (GraphQL) (auth, DB, row-level permissions)
  - Base44 SDK (legacy scaffolding / generated entities)
  - Express demo API (prototype REST endpoints)
- Migration layer: Adapter modules exist, but the app still contains direct calls to multiple sources of truth.
- Enterprise requirements: school pilots, district deployments, RBAC/ABAC, audit trails, privacy/consent, and reliable observability.

This flexibility enabled rapid prototyping but now creates risk:

- ambiguous source of truth
- inconsistent permissions
- duplicated domains (especially messaging)
- environment flags that can behave unexpectedly
- unpredictable runtime behavior across environments

Teachmo needs a single baseline architecture to ship a pilot reliably and harden for enterprise.

## Decision 1 — Declare the Phase 1 Source of Truth

**Decision**

Nhost + Hasura is the primary source of truth for:

- authentication
- user/session identity
- core data entities
- permissions enforcement
- audit logging inserts (where applicable)

Base44 becomes legacy scaffolding only and must not be called directly from UI code.
Express REST remains optional and is allowed only for:

- external integrations that don’t fit Hasura cleanly (SIS/LMS webhooks, ETL jobs)
- non-CRUD functions (e.g., scheduled jobs, notifications)

it must be treated as a separate service with real auth (no “demo-only” endpoints in production)

**Rationale**

Hasura gives deterministic permission enforcement and a clear boundary for multi-role access.

Nhost provides rapid auth + database operations with fewer moving parts than custom auth.

This aligns with Phase 2 enterprise needs: RBAC/ABAC, auditing, and multi-tenancy.

**Consequences**

All domain modules must ultimately resolve to GraphQL operations.

Base44 calls in UI are deprecated and must be routed through adapters until removed.

“Multiple backends” stops being a feature and becomes a migration phase.

**Follow-ups**

Remove/disable any production routes still backed by Base44 directly.

Track and permission all required Hasura tables and export metadata as source-controlled truth.

## Decision 2 — Establish an API Boundary: UI Talks Only to Domain Modules

**Decision**

UI components/pages MUST NOT call raw SDKs or raw GraphQL helpers.
UI can only interact via domain modules (example: src/domains/messages/*, src/domains/events/*) or via a single adapter layer that those domains use.

Approved calls from UI:

- domains/* functions or hooks that expose typed return objects and errors

Disallowed from UI:

- direct graphqlRequest(...)
- direct base44.entities.*
- direct REST fetch calls (except within domain modules)

**Rationale**

Prevents “API sprawl” and allows backend changes without rewriting UI.

Enables consistent error handling, caching strategy, and analytics instrumentation.

**Consequences**

Some refactors are required where UI currently calls mixed sources.

Domain modules become first-class, tested, and owned.

**Follow-ups**

Add lint rule / convention checks to prevent direct imports from disallowed modules.

## Decision 3 — Resolve Messaging as a Canonical Domain (No Duplicates)

**Decision**

Teachmo will have one canonical messaging schema and one canonical domain implementation.

Canonical tables: message_threads, messages, message_thread_participants (or equivalent)

Canonical domain module: src/domains/messages/* (single entry point)

Any legacy messaging modules (e.g., src/domains/messaging.js) are deprecated and removed once migration completes.

**Rationale**

Messaging is high-risk (privacy + compliance + safety). It must be:

- permission-safe by design
- auditable
- consistent across dashboards and roles

**Consequences**

All dashboards and messaging UIs must use the canonical domain.

Hasura permissions for messaging tables must be correctly enforced for each role.

**Follow-ups**

Add message moderation fields (if not already) and define policy around them.

Add basic audit trail entries for message actions.

## Decision 4 — Feature Flags Must Be Deterministic and Safe

**Decision**

All feature flags must parse env vars explicitly:

Allowed: envFlag('VITE_USE_GRAPHQL_MESSAGES') === true via helper

Disallowed: Boolean(import.meta.env.SOME_FLAG) (because "false" is truthy)

Add a small helper:

src/config/env.ts exports envFlag(name): boolean

**Rationale**

Environment behavior must be stable across dev/stage/prod.
“Flags silently on” is a production incident generator.

**Consequences**

Replace existing flag usage across adapters.

Document flags in .env.example.

**Follow-ups**

Add runtime diagnostic screen for admins (optional) showing resolved flags + build version.

## Decision 5 — Identity & Authorization: RBAC + Scoped Ownership

**Decision**

Teachmo adopts:

- RBAC for role selection (parent/teacher/admin/partner/student)
- Attribute-based scoping via org/school/classroom relationships (ABAC-ish)

Enforcement hierarchy:

- Hasura permissions enforce access (authoritative)
- UI route gating is convenience only (not security)

**Rationale**

K–12 environments require hard boundaries:

- teacher vs parent access
- cross-school separation
- partner portal isolation
- child data constraints

**Consequences**

Hasura metadata must be complete and source controlled.

Domain modules must assume “server can deny” and handle permission errors gracefully.

**Follow-ups**

Define tenancy model: organization → schools → classrooms → users.

Build “guardian verification / child linking” as a state machine, not a boolean.

## Decision 6 — Performance Baseline: Route-Level Code Splitting is Mandatory

**Decision**

All pages must be lazily loaded by route:

React.lazy + Suspense (or equivalent) is required for non-core routes.

Large “kitchen sink” imports are disallowed in the router index.

**Rationale**

Teachmo has many surfaces; initial bundle size must remain sane for parents on mobile.

**Consequences**

Router becomes lean.

Pages become chunked.

Better time-to-interactive.

**Follow-ups**

Add performance budget checks in CI (basic Lighthouse or bundle analyzer thresholds).

## Decision 7 — Unified Explore is a First-Class Product Surface

**Decision**

Teachmo standardizes discovery into a single surface:

- /discover with tabs:
  - For You
  - Activities
  - Events
  - Library

AI flows must deep-link into /discover with pre-applied filters via query params.

**Rationale**

Teachmo wins by turning advice into action. A unified Explore hub reduces UX sprawl and supports AI handoff.

**Consequences**

Deprecate standalone discovery pages once migrated into tabs.

Standardize filter schema and query param parsing.

**Follow-ups**

Implement a shared filter model and a URL <-> state synchronization pattern.

## Decision 8 — Observability and Auditability are Required for Pilot

**Decision**

Minimum observability stack is required before district/school pilot scaling:

- Frontend error tracking (Sentry or equivalent)
- Structured product events (at least: onboarding complete, message sent, activity saved, school request submitted)
- Audit log writes for sensitive actions (role changes, child linking, moderation actions)

**Rationale**

A pilot without instrumentation is a blindfolded marathon.

**Consequences**

Domain modules must emit analytics events.

Sensitive domain actions must insert audit logs.

**Follow-ups**

Define event schema and retention policy.

Add admin-facing “Audit” view.

## Non-Goals (Explicit)

For Phase 1 baseline:

- No custom on-prem LLM hosting
- No full SIS parity (only stubs/connectors and CSV import if needed)
- No “everything for everyone” UI completeness—ship a hardened vertical slice first

## Implementation Plan (High Level)

**Week 1: Clean boundaries**

- enforce env flags
- remove direct Base44 calls from UI
- unify messaging domain usage

**Week 2: Hasura truthfulness**

- track missing tables + permissions
- export metadata
- implement minimal audit log

**Week 3+: Pilot hardening**

- /discover unification
- AI deep links
- observability + analytics

## Decision Summary

- Primary backend: Nhost/Hasura (GraphQL)
- API boundary: UI → domains only
- Messaging: one schema + one domain module
- Flags: deterministic parsing only
- Auth: Hasura-enforced permissions + UI gating
- Performance: mandatory route splitting
- Product: Unified Explore as the action hub
- Ops: observability + audit trail required
