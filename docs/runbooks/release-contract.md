# Teachmo Release Contract

Teachmo release scripts and workflows must be deterministic, evidence-driven, and fail closed for production safety checks.

## Required local/CI release gates

Run before any pilot/staging/production deployment:

```bash
npm ci
npm run preflight:example
npm run check:production:fast
npm run test:scripts
npm run typecheck
npm run test:smoke
npm run build
```

Run and record known blockers separately:

```bash
npm run lint
npm run test -- --run
npm run check:size
```

These broader gates are still required for broad production GO. If they fail, document the command output, whether the failure is pre-existing, and the approved mitigation/owner.

## Release scripts

- `npm run release:check` runs fast production checks, smoke tests, build, and bundle-size check.
- `npm run release:pilot` runs `release:check` and prints the approved deployment handoff.
- `npm run ship` is an alias for `release:pilot`.
- `npm run ship:legacy-force-push` intentionally exits non-zero. Normal release paths must never force-push `main:pilot`.

## Protected environment fail-closed requirements

- Secret hygiene and Nhost config safety must pass.
- Auth bypass and mock auth must be rejected for staging/production.
- Hasura permission smoke must run with `REQUIRE_HASURA_SMOKE=true` on protected/manual/scheduled contexts.
- Missing Hasura smoke secrets in protected contexts are release-blocking, not skipped.

## Evidence required

Attach to the release issue/PR:

- CI run URL and commit SHA.
- `/healthz` output for deployed environment.
- Hasura permission smoke output or documented protected-context secret blocker.
- Nhost config review evidence.
- Sentry release evidence, if production/staging.
- Smoke checklist evidence for parent, teacher, partner, admin, ops, messaging, discover/explore, onboarding, PWA/offline, and maintenance mode.
