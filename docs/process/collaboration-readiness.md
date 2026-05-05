# Collaboration Readiness Automation

Generated: 2026-05-05

Teachmo tracks collaboration and automation hardening in two layers:

1. **Repo-owned controls** — workflows, CODEOWNERS routing, Renovate policy,
   Storybook/Chromatic wiring, synthetic workflow wiring, and security scans.
2. **External setup** — GitHub teams/branch protection, provider secrets,
   Chromatic project token, synthetic user accounts, code scanning visibility,
   and optional AI reviewer installation.

The repository cannot create the external resources without admin/provider
access, but it now audits their readiness from a single workflow and report.

## Policy manifest

Policy file:

```bash
config/collaboration-readiness.json
```

The manifest defines:

- expected default branch;
- required hardening workflows;
- expected branch-protection check names;
- CODEOWNERS placeholder team patterns;
- Renovate automerge guardrails;
- external secret groups by capability.

Update this manifest when required checks are renamed, new provider options are
added, or owner placeholders are replaced with real teams.

## Local commands

Advisory/local mode:

```bash
npm run ops:collaboration-readiness
```

Strict mode:

```bash
npm run ops:collaboration-readiness -- --strict
```

Optional focused strictness:

```bash
npm run ops:collaboration-readiness -- --require-preview
npm run ops:collaboration-readiness -- --require-visual
npm run ops:collaboration-readiness -- --require-synthetics
npm run ops:collaboration-readiness -- --check-github
```

Reports are written to `artifacts/ops/collaboration-readiness.{json,md}` by
default and redact secret-like values.

## Workflow

Workflow:

```bash
.github/workflows/collaboration-readiness.yml
```

Triggers:

- pull requests touching collaboration automation files;
- weekly schedule;
- manual `workflow_dispatch`.

Pull requests run advisory mode so missing external setup does not block normal
development. Scheduled/manual runs can run strict mode and should be promoted to
blocking only after external setup is complete.

## What the audit checks

Static repo checks:

- required hardening workflow files exist;
- `renovate.json` parses;
- Renovate automerge remains limited to low-risk devDependency patches;
- runtime/security/major/auth-sensitive dependency updates remain
  human-reviewed;
- CODEOWNERS exists and has path/owner entries;
- placeholder CODEOWNERS teams are reported until replaced.

External setup checks:

- Vercel or Netlify preview provider secrets;
- Chromatic visual regression token;
- synthetic base/API URLs and parent/teacher/admin credentials;
- live Hasura GraphQL codegen credentials;
- Hasura permission smoke JWTs.

Optional GitHub API checks:

- branch protection readability;
- required status checks when branch protection is readable;
- CODEOWNER review requirement;
- code scanning API visibility.

If GitHub API access returns `403`, the audit reports a warning unless
`--require-github-api` is explicitly supplied.

## Strictness controls in existing workflows

The hardening workflows now support advisory-to-blocking promotion without YAML
edits:

- Preview environment:
  - manual input `require_provider`;
  - fails if neither Vercel nor Netlify secrets are configured when required.
- Visual regression:
  - manual input `require_chromatic`;
  - fails if `CHROMATIC_PROJECT_TOKEN` is absent when required;
  - Chromatic action is pinned to `chromaui/action@v11`.
- Synthetic monitoring:
  - manual input `require_credentials`;
  - scheduled runs always require real synthetic credentials;
  - manual runs can opt out for connectivity-only checks.

## Remaining truly external setup

These items still require a repository/org/provider administrator:

- create/rename real GitHub teams and replace CODEOWNERS placeholders;
- enable branch protection and required checks;
- install/enable Renovate and optional AI reviewer apps;
- create Vercel/Netlify/Chromatic projects and tokens;
- create staging/production synthetic users;
- configure repository/environment secrets;
- enable and review GitHub code scanning.

Once complete, run:

```bash
npm run ops:collaboration-readiness -- --strict --check-github
```

and attach the generated Markdown report to launch/readiness evidence.
