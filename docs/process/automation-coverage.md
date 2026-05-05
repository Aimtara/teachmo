# Automation Coverage Audit

Teachmo tracks collaborator-facing automation coverage with a repo-local
manifest and report generator.

## Command

```bash
npm run ops:automation-coverage
npm run check:automation-coverage
```

Reports are written to `artifacts/ops/automation-coverage.{json,md}` by
default.

## Workflow

Workflow: `.github/workflows/automation-coverage.yml`

Triggers:

- pull requests that touch stories, E2E specs, GraphQL-heavy source files,
  automation coverage config, or the audit script;
- weekly schedule;
- manual dispatch with optional strict mode.

Pull request runs are advisory by default: missing high-risk visual/synthetic
coverage fails, while GraphQL inventory findings are reported as warnings.
Strict manual/scheduled runs fail on warnings so maintainers can use them as a
backlog burndown gate.

## Manifest

Config: `config/automation-coverage.json`

The manifest defines:

- visual surfaces that must have Storybook stories;
- synthetic journeys that must be represented in Playwright specs;
- GraphQL document scan globs and high-risk source paths;
- allowed dynamic GraphQL operation files.

Update this manifest whenever a launch-critical route, role journey, or
high-risk GraphQL area is added.

## Visual coverage

The audit checks required Storybook story files for:

- login/auth entry;
- teacher assignments;
- messaging thread;
- calendar/office hours;
- admin analytics.

Storybook/Chromatic still performs the visual diff. This audit answers the
separate question: "did we remember to add visual coverage for the risky
surface?"

## Synthetic coverage

The audit checks that the synthetic Playwright spec contains route and
environment markers for:

- public landing/login;
- parent AI/discovery;
- teacher dashboard/assignments;
- admin integration health/analytics;
- backend health endpoint.

It does not execute the browser journey. Execution remains in
`.github/workflows/synthetic-monitoring.yml`.

## GraphQL inventory

The script inventories GraphQL `query`, `mutation`, and `subscription`
operations in frontend and Nhost function files. It reports:

- total operations and file count;
- unnamed operations;
- dynamic template operations that may not be compatible with GraphQL Code
  Generator;
- high-risk operations that should be migrated toward generated typed
  documents.

Warnings are intentional at first. Use the report to build a typed GraphQL
burndown list instead of attempting to type every operation in one risky change.

## Strict mode

```bash
npm run check:automation-coverage
```

Strict mode exits nonzero when warnings remain. Enable it as a required check
only after current GraphQL inventory warnings have been triaged or allowlisted.
