## Summary

- Describe what changed and why.

## Governed AI Definition of Done Checklist

- [ ] Policy evaluation exists for the AI flow before model invocation.
- [ ] Outbound payload sanitization/redaction is implemented.
- [ ] Rollout is controlled by feature flags and tenant scope.
- [ ] Governance and verification telemetry fields are emitted.
- [ ] High-stakes behavior defines verifier/shadow vs enforcement mode.
- [ ] Admin/reviewer visibility is available where required.
- [ ] Tests cover policy, redaction, verifier, and rollout behavior.
- [ ] Docs/ADR updated for architectural policy changes.

## Testing

- [ ] Added or updated tests.
- [ ] Included relevant command output in PR description.
