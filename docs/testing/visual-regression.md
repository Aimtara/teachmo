# Visual Regression Testing

Teachmo visual regression testing uses the existing Storybook catalog plus
Chromatic snapshots. The workflow is intentionally split into two layers:

1. `npm run build-storybook` always runs and uploads the static Storybook build
   as a GitHub Actions artifact.
2. Chromatic snapshot comparison runs when `CHROMATIC_PROJECT_TOKEN` is
   configured. When a project token is present, unapproved diffs fail the check.

## Workflow

Workflow: `.github/workflows/visual-regression.yml`

Triggers:

- pull requests,
- pushes to `main`,
- manual `workflow_dispatch`.

Artifacts:

- `storybook-static` — the exact Storybook bundle reviewed by Chromatic or
  available for manual inspection when Chromatic is not configured.

## Required setup

1. Create a Chromatic project connected to the Teachmo repository.
2. Add `CHROMATIC_PROJECT_TOKEN` as a GitHub Actions secret.
3. Mark the `visual-regression` workflow as a required PR check once the token
   is configured.
4. Keep core UI surfaces covered by stories under `src/**/*.stories.*`.

## Approval policy

Visual diffs are treated as release evidence:

- intended diffs require reviewer approval in Chromatic;
- unexpected diffs block merge until fixed or explicitly approved;
- high-risk areas such as auth, role dashboards, admin analytics, messaging,
  directory import, and AI governance require product/design review before
  approving changes.

## Local verification

```bash
npm run build-storybook
```

The generated `storybook-static/` directory can be served locally for manual
review. Do not commit the generated Storybook bundle.

## Current coverage

The repository includes stories for core UI primitives, admin analytics
components, and the first launch-critical collaboration surfaces:

- `src/components/ui/button.stories.jsx`
- `src/components/ui/card.stories.jsx`
- `src/components/ui/tag.stories.jsx`
- `src/components/admin/analytics/*.stories.jsx`
- `src/components/analytics/*.stories.jsx`
- `src/pages/Login.stories.jsx`
- `src/components/teacher/AssignmentsView.stories.jsx`
- `src/components/messaging/MessageThread.stories.tsx`
- `src/components/calendar/CalendarView.stories.jsx`

New UI components introduced for launch-critical flows should add Storybook
stories in the same change set. Remaining high-value coverage targets are full
role dashboards, directory/import review flows, and AI assistant/governance
surfaces with mocked providers.
