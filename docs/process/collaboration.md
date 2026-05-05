# Collaboration and Pull Request Workflow

Generated: 2026-05-04  
Owner placeholders: Engineering Lead, Security Lead, Product Lead, QA/Release Lead

Teachmo PR collaboration is designed to keep low-risk automation moving quickly
while preserving human review for high-risk education, privacy, AI, auth, and
operations changes.

## CODEOWNERS routing

`.github/CODEOWNERS` routes review by domain:

| Path | Primary review focus |
| --- | --- |
| `src/components/**`, `src/pages/**`, `src/domains/**`, `src/services/**` | Frontend/domain behavior, accessibility, API-boundary policy |
| `backend/**` | Express APIs, migrations, RBAC/auth, tenancy, logging |
| `nhost/**` | Nhost migrations, Hasura metadata, storage/auth settings |
| `scripts/**`, `.github/workflows/**`, `renovate.json` | CI/automation safety and failure behavior |
| `Dockerfile`, `backend/Dockerfile`, `docs/security/**` | Container/runtime vulnerability scanning and remediation |
| `docs/readiness/**`, `docs/runbooks/**`, `docs/ops/**` | Evidence, runbooks, release/ops process |
| `backend/ai/**`, `backend/middleware/*Governance*`, `docs/ai*` | AI governance, redaction, policy evaluation |

Owner handles are placeholders and should be replaced with actual GitHub teams
before CODEOWNERS is enforced in branch protection.

Run the collaboration readiness audit to track owner placeholders, workflow
presence, external secrets, and branch-protection visibility:

```bash
npm run ops:collaboration-readiness
```

See `docs/process/collaboration-readiness.md` for strict mode and workflow
usage.

## Preview environments

Workflow: `.github/workflows/preview-environment.yml`

Triggers:

- Pull requests.
- Manual `workflow_dispatch`.

Behavior:

1. Install dependencies.
2. Run `npm run check:production:fast`.
3. Build the frontend with `npm run build:ci`.
4. Upload `dist/` as a preview artifact.
5. Deploy to Vercel when `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and
   `VERCEL_PROJECT_ID` are configured.
6. Deploy to Netlify when `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID` are
   configured.
7. If no provider secrets are present, the workflow succeeds with an explicit
   setup notice and the build artifact remains available for review.

The repository cannot create provider projects or tokens automatically. A human
with provider-admin access must configure the chosen platform and repository
secrets.

Manual preview dispatch supports `require_provider: true` once provider secrets
are expected. In that mode, missing Vercel/Netlify configuration fails the
workflow instead of only uploading a build artifact.

## Required evidence by change type

| Change type | Required evidence |
| --- | --- |
| UI/component behavior | Unit tests when available, Storybook/Chromatic result, screenshot or Playwright report for user-visible changes |
| Backend/API/RBAC | Backend Jest/API tests, permission smoke when credentials exist, tenancy/RBAC reasoning |
| Nhost/Hasura migrations or metadata | Schema/metadata CI report, migration output, permission smoke when live tokens exist |
| Dependency updates | Renovate/Dependency Security workflow, `npm run check:audit`, release notes review for runtime/security updates |
| AI governance | AI governance tests, PII/redaction checks, compliance report |
| Secret rotation, production backup/restore, rollback | GitHub Environment approval record, dry-run report, execution report, post-action smoke evidence |
| Gate 2/3/4 features | Role smoke/Gate proof Playwright report plus human review for identity mapping, assignments sync, and admin analytics |

## Safe dependency automerge boundaries

Renovate is configured to automerge only low-risk devDependency patch updates
after required checks pass. Runtime dependencies, major updates, lockfile-only
changes that affect runtime packages, and security updates require human review.

Renovate platform automerge is intentionally scoped to devDependency patch
updates. The configured required status checks use the job-level names GitHub
reports for the current workflows:

- `build`
- `npm audit policy`
- `GitHub dependency review`
- `schema-metadata`

If check names drift, prefer disabling automerge over widening the automerge
rule. Runtime dependencies, major updates, security updates, and
auth/Nhost/Express/React/Vite-sensitive changes stay human-reviewed.

## Required branch protection checks

Recommended required checks once each workflow has produced at least one stable
green run:

- `CI / build`
- `launch-gates / launch-gates`
- `Dependency and security automation / npm audit policy`
- `Dependency and security automation / GitHub dependency review`
- `Schema and Metadata Validation / schema-metadata`
- `CodeQL / Analyze JavaScript and TypeScript`
- `Container and filesystem security / Trivy filesystem scan`
- `Container and filesystem security / Trivy image scan`
- `Visual regression / storybook`
- `Synthetic Monitoring / synthetic`

Stage advisory-to-blocking rollout deliberately:

1. Require CI, launch-gates, dependency-security, and schema/metadata first.
2. Add CodeQL and Trivy after the initial SARIF baseline is triaged.
3. Add visual-regression after Chromatic baseline snapshots are approved.
4. Require CODEOWNER review only after placeholder owner handles have been
   replaced with valid GitHub users/teams.

## Optional AI review bot

If the repository owner enables an AI review product externally, configure it to:

- Summarize PR risk areas.
- Flag auth/RBAC/tenant isolation changes.
- Flag raw `fetch`/GraphQL UI calls that may violate API-boundary policy.
- Flag PII/logging/AI prompt changes.

AI review is advisory only. CODEOWNERS and required checks remain authoritative.

## Human approval checkpoints

High-risk workflows use GitHub environments rather than comments as the
auditable approval gate:

- `staging` for staging secret rotation, staging rollback, and staging
  backup/restore execution.
- `production` for production secret rotation, production backup/restore, and
  production rollback.

Approval records must be copied into the relevant readiness evidence template
before broad production launch.
