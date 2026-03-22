# ADR 2026-03-22 — AI Governance and Delivery Principles

- **Status:** Accepted
- **Date:** 2026-03-22
- **Deciders:** Teachmo engineering
- **Related docs:** `docs/ai-governance-principles.md`, `docs/adr/2026-03-ai-governance-rollout.md`, `docs/adr/0007-ai-provider-strategy-safety-boundaries.md`

## Context

Teachmo already enforces key practices across code and documentation: TypeScript preference for shared logic, privacy-safe logging, tests for new business logic, AI transparency requirements, observability, and ADR-backed architecture changes.

As governed AI capabilities expand, those expectations need to be codified as platform-level rules that appear in both architecture documents and implementation paths.

## Decision

Teachmo adopts seven non-negotiable AI governance and delivery principles:

1. Governance before generation.
2. Zero-trust data perimeter.
3. Progressive delivery by default.
4. Maker/checker for high-stakes AI.
5. Policy-as-code.
6. Observable by design.
7. Stability over novelty.

These principles are canonical in `docs/ai-governance-principles.md` and are required for governed AI design reviews.

## Consequences

### Positive

- Increases consistency between architecture intent and runtime behavior.
- Improves auditability for district procurement, trust, and compliance reviews.
- Supports product stability goals by reducing uncontrolled AI rollout risk.

### Trade-offs

- Slightly higher implementation overhead for new AI capabilities.
- More required documentation/test updates in pull requests.

## Required engineering guardrails

- Policy evaluation must occur before external model calls.
- Outbound AI payloads must be sanitized before adapter invocation.
- High-stakes AI flows must implement maker/checker behavior and verifier telemetry.
- Governed AI launches require tenant-scoped feature flags and rollout sequencing.
- Material policy changes require test and ADR/doc updates in the same change set.

## Rollout and enforcement

- Apply these principles immediately to new governed AI work.
- Backfill existing governed AI surfaces incrementally based on risk.
- Enforce definition-of-done checks in pull request review.
