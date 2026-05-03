# Lint Debt Register

Generated: 2026-05-03

## Current status

`npm run lint` remains red and is formally ratcheted. Full green was not safe in
one pass because the baseline included thousands of broad legacy JS/JSX policy
errors and behavior-sensitive hook warnings.

Preferred release/production gate:

- `npm run lint:production`
- `npm run check:lint-ratchet`

Both commands run the strict lint ratchet and fail if debt increases. The
production aggregate checks now use the ratchet gate instead of the red legacy
full-lint command.

Execution baseline:

- Total problems: 3,622
- Errors: 3,465
- Warnings: 157

After scoped config/policy work, ratcheted lint state:

- Total ratcheted problems: 1,006
- Errors: 849
- Warnings: 157
- Removed from hard legacy gate: 2,414 `react/prop-types` and 162 `react/no-unescaped-entities` findings.

## Rule counts

| Rule | Count | Category | Proposed treatment |
| --- | ---: | --- | --- |
| `react/prop-types` | 2,414 | Legacy JS/JSX policy debt | Scoped off as a legacy JS/JSX policy; tracked in docs and ratchet baseline. |
| `no-unused-vars` | 667 | Mechanical/source debt | Fix safe instances; ratchet remainder if too broad. |
| `react/no-unescaped-entities` | 162 | User-facing copy lint | Scoped off for legacy copy; avoid broad copy churn without owner review. |
| `react-hooks/exhaustive-deps` | 83 | Behavior-sensitive hook debt | Do not auto-fix broadly without characterization. |
| `no-undef` | 74 | Config/environment + real missing symbols | Fix globals/config first, then source. |
| `react-refresh/only-export-components` | 68 | Dev-refresh policy warnings | Scoped policy or targeted refactors. |
| `@typescript-eslint/no-explicit-any` | 54 | TS migration debt | Fix obvious cases; ratchet remainder. |
| `no-redeclare` | 28 | Source/test debt | Inspect before mechanical fixes. |
| `@typescript-eslint/no-unused-vars` | 13 | Mechanical TS debt | Fix safe instances. |
| `no-case-declarations` | 10 | Mechanical JS debt | Add block scopes where safe. |

Additional small categories: `react/display-name`, `react-hooks/rules-of-hooks`, `react/no-children-prop`, `no-prototype-builtins`, `no-unsafe-finally`, `react/jsx-no-undef`, `react/no-unknown-property`, `no-useless-escape`.

## Remediation completed

- Added scoped Vitest globals for test files.
- Added service-worker globals for `src/service-worker.ts`.
- Disabled core `no-undef` for TypeScript files and rely on `npm run typecheck` for TS symbol validation.
- Fixed the `OAuth2Consent` parse blocker while preserving redirect-scheme security assertions.
- Added `scripts/check-lint-ratchet.mjs`.
- Added `npm run lint:production` and `npm run check:lint-ratchet`.
- Added lint ratchet to `check:production:fast`, `check:launch`, and `check:production`.

## Current ratchet baseline

| Rule | Allowed count |
| --- | ---: |
| `no-unused-vars` | 668 |
| `no-undef` | 33 |
| parser errors | 25 |
| `@typescript-eslint/no-explicit-any` | 53 |
| `@typescript-eslint/no-unused-vars` | 13 |
| `no-redeclare` | 31 |
| `react-hooks/exhaustive-deps` | 83 |
| `react-refresh/only-export-components` | 68 |
| other listed lint rules | exact count in `scripts/check-lint-ratchet.mjs` |

The ratchet also keeps the original higher full-debt baseline visible, so future
cleanup can reduce counts without requiring a large coordinated rewrite.

## Owner/date placeholders

| Debt area | Owner placeholder | Target date placeholder | Gate |
| --- | --- | --- | --- |
| Legacy React prop-types policy | Frontend Platform | 2026-06-30 | Lint ratchet if not fully green. |
| Unused vars across legacy source | Frontend + Backend Platform | 2026-06-30 | Lint ratchet if not fully green. |
| Hook dependency review | Frontend Platform | 2026-07-15 | Warnings tracked; behavior-sensitive fixes require tests. |
| TypeScript `any` migration | TypeScript Migration Owner | 2026-07-31 | Existing TS ratchet plus lint ratchet. |
