# AI Governance and Delivery Principles (SSOT)

## Purpose

Teachmo treats AI governance, privacy protection, and progressive delivery as core platform architecture rather than feature-specific add-ons. This document is the single source of truth (SSOT) for how governed AI workflows are designed, implemented, and rolled out.

## Non-negotiable principles

1. **Governance before generation**
   - No AI workflow may call an external model until policy evaluation runs.
   - Governance decisions must be recorded with a request identifier.
2. **Zero-trust data perimeter**
   - Outbound AI payloads are treated as hostile egress boundaries.
   - Sensitive data must be minimized, redacted, or denied before external transmission.
3. **Progressive delivery by default**
   - Governed AI functionality must ship behind tenant-scoped feature flags.
   - Risky capabilities roll out progressively, not through long-lived branches.
4. **Maker/checker for high-stakes AI**
   - Generation and verification are separate concerns for high-impact workflows.
   - Verifier outcomes may block, redact, queue, or downgrade outputs.
5. **Policy-as-code**
   - Safety/compliance rules that materially affect access, scope, or output must be versioned and testable.
   - Policy changes require docs and architecture record updates.
6. **Observable by design**
   - Governed AI features are incomplete without structured telemetry and reviewability.
   - Decisions, matched policies, verifier outcomes, and rollout state must be inspectable.
7. **Stability over novelty**
   - AI implementation choices must prioritize reliability, traceability, and operational safety.
   - New sophistication does not justify increased incident risk.

## Scope

These principles apply to all Teachmo AI workflows, including:

- backend AI routes and adapters,
- governed tools and skill execution,
- tenant-facing and admin-facing AI surfaces,
- AI review and governance telemetry pipelines.

## Required implementation patterns

All governed AI workflows must:

- run policy evaluation before any external model call,
- sanitize outbound payloads before model invocation,
- include a governance decision object in execution context,
- emit structured telemetry for governance and verification outcomes,
- use feature flags for rollout,
- define verifier behavior for high-stakes flows.

Minimum telemetry fields for governed workflows:

- `requestId`
- `policyOutcome`
- `matchedPolicies`
- `denialReason`
- `requiredSkill`
- `tenantScope`
- `verifier` (status/issues/enforcement mode)

## Rollout model

1. Internal enablement for non-production test tenants.
2. Shadow-mode verification with metrics collection.
3. Limited pilot rollout by tenant/role.
4. Gradual enforcement after false-positive and operations review.

## Exceptions process

Any exception to these principles must include:

- explicit risk statement,
- temporary mitigation plan,
- owner and sunset date,
- ADR update (or new ADR) documenting rationale and rollback plan.

## Definition of done (governed AI features)

A governed AI feature is not complete unless all are true:

- policy evaluation exists and is tested,
- outbound payload sanitization exists and is tested,
- rollout is controlled by feature flags,
- governance and verification telemetry is emitted,
- verifier behavior is defined for high-stakes scenarios,
- admin visibility exists where operationally required,
- docs/ADR are updated when architecture changes.
