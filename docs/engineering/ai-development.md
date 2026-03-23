# AI Development Rules

## You MUST
- Route all AI requests through governance evaluation.
- Ensure outbound payloads are sanitized.
- Add feature flags for rollout control.
- Emit structured telemetry.
- Write tests for policy behavior, redaction, and verifier logic where applicable.

## You MUST NOT
- Call external AI models directly from routes or components.
- Send raw user/student data to model providers.
- Ship high-stakes AI features without verification or shadow testing.

## Definition of Done
- [ ] Policy evaluation exists.
- [ ] PII redaction is enforced.
- [ ] Feature is gated behind flags.
- [ ] Governance metadata is logged.
- [ ] Verifier behavior is defined (if high-stakes).
- [ ] Admin visibility exists (if applicable).
- [ ] Tests are included.
- [ ] Docs/ADR updated (if architecture changed).
