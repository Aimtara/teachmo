# Compliance and AI Governance Automation

Teachmo compliance automation combines static scanners, existing AI governance tests, and a generated report artifact. It does not replace legal/privacy officer review; it gives reviewers repeatable evidence that repository-controlled controls have not regressed.

## Workflow

`.github/workflows/compliance-ai-governance.yml`

Triggers:

- Pull requests and pushes to `main`
- Weekly scheduled run
- Manual dispatch

Jobs:

1. Install dependencies.
2. Run `npm run check:secret-hygiene`.
3. Run `npm run check:pii-logging`.
4. Run Gitleaks if the CLI is available on the runner.
5. Run backend AI governance tests:
   - `backend/__tests__/governance.policy.test.js`
   - `backend/__tests__/governance.runtime.test.js`
   - `backend/__tests__/ai.enforcement.test.js`
6. Generate `artifacts/ops/compliance-ai-governance.{json,md}` with `npm run ops:compliance-report`.

## Report contents

The report records:

- secret hygiene status,
- PII logging status,
- Gitleaks availability/result,
- AI governance policy/runtime/enforcement test status,
- COPPA/FERPA control evidence pointers,
- remaining human review requirements.

## Human review requirements

Manual legal/privacy/AI governance sign-off remains required before broad production launch:

- COPPA/FERPA data-flow review,
- district retention/deletion approval,
- AI vendor DPA and data-processing review,
- DSAR/export/deletion process rehearsal,
- approval of any high-stakes AI workflow requiring human intervention.

Use `docs/readiness/evidence/legal-privacy-ai-review-template.md` for the final evidence packet.
