# Compliance release gates

Teachmo release automation must fail closed for controls that protect child,
student, family, school, AI, and administrative data.

## Gate commands

- `npm run typecheck`
- `npm run check:production-auth-safety`
- `npm run check:secret-hygiene`
- `npm run check:pii-logging`
- `npm run check:compliance-foundations`
- `npx jest --config jest.backend.config.cjs --runInBand backend/__tests__/governance.runtime.test.js backend/__tests__/governance.policy.test.js backend/__tests__/ai.enforcement.test.js`
- `npm run check:hasura-readiness`
- `npm run test:a11y` where UI/a11y tooling is available
- `npm run ops:compliance-report -- --output-dir artifacts/ops`

## Report artifact

`scripts/ops/compliance-report.mjs` emits timestamp, git commit, tests run,
pass/fail counts, unresolved critical exceptions, data classification coverage,
audit taxonomy coverage, PII scan result, AI governance result, accessibility
smoke result, and known limitations.

## Protected environment rules

Production/staging release must not enable mock or bypass auth flags. Secret
scanning, PII logging scanning, compliance foundation tests, and AI governance
tests are blocking release controls.
