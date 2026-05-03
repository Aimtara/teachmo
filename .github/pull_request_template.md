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

## Production readiness gates

- [ ] `npm run check:production:fast`
- [ ] `npm run check:secret-hygiene`
- [ ] `npm run check:nhost-config-safety`
- [ ] `npm run check:api-boundaries`
- [ ] `npm run check:hasura-readiness`
- [ ] `npm run check:pii-logging`
- [ ] If touching Nhost/Hasura/RBAC: attached permission smoke or documented manual evidence.
- [ ] If touching logging/AI/messaging/child data: verified no raw PII, prompts, tokens, or message bodies are logged.
