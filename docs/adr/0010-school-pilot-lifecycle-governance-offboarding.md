# ADR 0010 — School Pilot Lifecycle, Governance & Offboarding Strategy

- **Status:** Proposed (ready to adopt)
- **Date:** 2025-12-19
- **Owners:** Product + Engineering + Partnerships
- **Applies to:** School pilots, districts, data lifecycle, GTM

## Context

School pilots often fail because districts fear unclear scope, hidden data retention, messy exits, lock-in, and vague success criteria. Teachmo’s credibility depends on being easy to try and easy to leave through a defined pilot lifecycle.

## Decision Summary

Teachmo formalizes a four-phase School Pilot Lifecycle with explicit governance, success criteria, and offboarding guarantees. Pilots are treated as time-bound, reversible experiments, not stealth deployments.

## Phase 1 — Pilot Setup (2–4 weeks)

### Scope Definition (required)

- participating schools
- roles enabled (parent, teacher, admin)
- features enabled
- AI features enabled/disabled
- retention defaults
- success metrics

All scope decisions are documented, approved by school/district admin, and encoded in configuration.

### Technical Setup

- org + school records created
- roles provisioned
- feature flags set
- audit logging enabled
- environment labeled as “Pilot”

## Phase 2 — Pilot Execution (6–8 weeks typical)

### Operating Principles

- No breaking changes mid-pilot
- No schema changes without migration
- No silent feature rollouts
- Support issues triaged within SLA

### Monitoring

- weekly engagement metrics
- onboarding completion
- messaging volume
- AI recommendation acceptance
- qualitative feedback (structured)

## Phase 3 — Evaluation & Decision

At pilot end, Teachmo provides engagement summary, outcomes vs goals, known issues, accessibility findings, and data usage summary. The district decides to proceed to contract, extend pilot, or sunset pilot. No automatic conversion.

## Phase 4 — Offboarding (Guaranteed)

### Data Handling

- parent accounts deactivated
- guardian links severed
- child profiles anonymized or deleted (per policy)
- messages deleted or redacted per retention rules
- audit logs retained minimally (compliance)

### Access

- logins disabled
- integrations disconnected
- API keys revoked

### Confirmation

Teachmo provides written confirmation and a data disposition summary. Teachmo commits to a clean exit within a defined window (e.g., 30–60 days).

## Governance & Safeguards

- No dark patterns (no surprise billing, no auto-enrollment beyond scope, no upsell pressure during pilot)
- Pilot scope freezes feature surface; new features require explicit opt-in
- Pilot agreement references retention and offboarding ADRs
- Legal holds respected if applicable

## Consequences

- Forces go-to-market discipline
- Prevents “pilot creep”
- Builds long-term trust
- Makes Teachmo easier to recommend within districts

## Follow-ups / Implementation Tasks

- Create Pilot Configuration schema
- Build pilot admin dashboard (basic)
- Create pilot metrics report template
- Document offboarding runbook
- Align sales/partnerships on lifecycle language
