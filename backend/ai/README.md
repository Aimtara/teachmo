# Backend AI Governance Guardrails

This directory contains Teachmo backend AI orchestration and governance components.

## Required flow for governed AI

1. **Policy evaluation first**
   - Evaluate request context and create a governance decision before external model use.
2. **Sanitize before egress**
   - Any payload sent outside Teachmo-controlled systems must be redacted/minimized.
3. **Governed execution**
   - Execute skills/actions with governance decision context.
4. **Verification for high-stakes workflows**
   - Run independent verification (maker/checker).
5. **Structured observability**
   - Emit request and decision metadata for review/audit surfaces.

## Contract expectations

- No direct external model calls from ad hoc route handlers without policy evaluation.
- Governance context should include at least:
  - `requestId`
  - `policyOutcome`
  - `matchedPolicies`
  - `denialReason`
  - `requiredSkill`
- High-stakes routes must support shadow-mode verification before enforcement.
- Logging must remain privacy-safe (no raw PII in logs, prompts, or vendor payloads).

## Testing expectations

For new governed AI logic, include tests for:

- policy outcomes and policy identifiers,
- redaction/sanitization behavior,
- verifier behavior (pass/fail/redaction conditions),
- feature-flagged rollout behavior,
- telemetry metadata shape.
