# Lint Debt Register

Generated: 2026-05-03

Updated: 2026-05-05. The closure sprint did not increase the lint ratchet: `npm run check:lint-ratchet` still reports 517 total problems with parser and `no-undef` at 0. The new Gate/security code avoids adding explicit `any` debt in TypeScript helpers.

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

After scoped config/policy work, the API-boundary adapter pass, and the follow-up
lint burn-down pass, ratcheted lint state:

- Total ratcheted problems: 517
- Errors: 372
- Warnings: 145
- Removed from hard legacy gate: 2,414 `react/prop-types` and 162 `react/no-unescaped-entities` findings.

## Rule counts

| Rule | Count | Category | Proposed treatment |
| --- | ---: | --- | --- |
| `react/prop-types` | 2,414 | Legacy JS/JSX policy debt | Scoped off as a legacy JS/JSX policy; tracked in docs and ratchet baseline. |
| `no-unused-vars` | 240 | Mechanical/source debt | Fix safe instances; ratchet remainder if too broad. |
| `react/no-unescaped-entities` | 162 | User-facing copy lint | Scoped off for legacy copy; avoid broad copy churn without owner review. |
| `react-hooks/exhaustive-deps` | 82 | Behavior-sensitive hook debt | Do not auto-fix broadly without characterization. |
| `no-undef` | 0 | Config/environment + real missing symbols | Eliminated in May 2026 closure; ratchet prevents reintroduction. |
| `react-refresh/only-export-components` | 63 | Dev-refresh policy warnings | Scoped policy or targeted refactors. |
| `@typescript-eslint/no-explicit-any` | 111 | TS migration debt | Reduced by moving SSO/profile/feature-flag code into typed domain adapters; ratcheted explicitly. |
| `no-redeclare` | 7 | Source/test debt | Inspect before mechanical fixes. |
| `@typescript-eslint/no-unused-vars` | 1 | Mechanical TS debt | Nearly eliminated; keep at ratchet 1 until the remaining item is safely reviewed. |
| `no-case-declarations` | 0 | Mechanical JS debt | Eliminated by adding block scopes around case clauses. |

Additional small categories: `react/display-name`, `react-hooks/rules-of-hooks`, `react/no-children-prop`, `no-prototype-builtins`, `no-unsafe-finally`, `react/jsx-no-undef`, `react/no-unknown-property`, `no-useless-escape`.

## Remediation completed

- Added scoped Vitest globals for test files.
- Added service-worker globals for `src/service-worker.ts`.
- Eliminated the parser bucket by renaming TS-syntax admin pages to TSX, ignoring non-runtime testing artifacts/declaration files, and removing stale disable directives.
- Eliminated `no-undef` by importing missing entities, fixing undefined state references, and replacing pseudocode agent calls with safe local adapters.
- Disabled core `no-undef` for TypeScript files and rely on `npm run typecheck` for TS symbol validation.
- Fixed the `OAuth2Consent` parse blocker while preserving redirect-scheme security assertions.
- Added `scripts/check-lint-ratchet.mjs`.
- Added `npm run lint:production` and `npm run check:lint-ratchet`.
- Added lint ratchet to `check:production:fast`, `check:launch`, and `check:production`.
- Moved discover recommendations, AI prompt library, tenant profile/feature flag/SSO hooks, and several admin pages behind domain adapters, lowering `@typescript-eslint/no-explicit-any` and preserving parser/`no-undef` at zero.
- Removed high-volume unused imports/state across source via `eslint-plugin-unused-imports`, reducing ratcheted lint **878 → 517** while keeping behavior-sensitive warning debt unchanged.

## Current ratchet baseline

| Rule | Allowed count |
| --- | ---: |
| `no-unused-vars` | 240 |
| `no-undef` | 0 |
| parser errors | 0 |
| `@typescript-eslint/no-explicit-any` | 111 |
| `@typescript-eslint/no-unused-vars` | 1 |
| `no-redeclare` | 7 |
| `react-hooks/exhaustive-deps` | 82 |
| `react-refresh/only-export-components` | 63 |
| `no-case-declarations` | 0 |
| `react/no-children-prop` | 0 |
| `no-prototype-builtins` | 0 |
| `react/jsx-no-undef` | 0 |
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
