# Lint Debt Register

Generated: 2026-05-03

## Current status

`npm run lint` is red in the execution baseline:

- Total problems: 3,622
- Errors: 3,465
- Warnings: 157

This pass prioritizes config/environment fixes and safe mechanical fixes first. If full cleanup is too broad for one pass, a strict ratchet must prevent new lint debt and release gates must fail on regression.

## Rule counts

| Rule | Count | Category | Proposed treatment |
| --- | ---: | --- | --- |
| `react/prop-types` | 2,414 | Legacy JS/JSX policy debt | Fix in touched files where safe; otherwise scoped legacy policy/ratchet. |
| `no-unused-vars` | 667 | Mechanical/source debt | Fix safe instances; ratchet remainder if too broad. |
| `react/no-unescaped-entities` | 162 | User-facing copy lint | Fix where safe; avoid changing meaning. |
| `react-hooks/exhaustive-deps` | 83 | Behavior-sensitive hook debt | Do not auto-fix broadly without characterization. |
| `no-undef` | 74 | Config/environment + real missing symbols | Fix globals/config first, then source. |
| `react-refresh/only-export-components` | 68 | Dev-refresh policy warnings | Scoped policy or targeted refactors. |
| `@typescript-eslint/no-explicit-any` | 54 | TS migration debt | Fix obvious cases; ratchet remainder. |
| `no-redeclare` | 28 | Source/test debt | Inspect before mechanical fixes. |
| `@typescript-eslint/no-unused-vars` | 13 | Mechanical TS debt | Fix safe instances. |
| `no-case-declarations` | 10 | Mechanical JS debt | Add block scopes where safe. |

Additional small categories: `react/display-name`, `react-hooks/rules-of-hooks`, `react/no-children-prop`, `no-prototype-builtins`, `no-unsafe-finally`, `react/jsx-no-undef`, `react/no-unknown-property`, `no-useless-escape`.

## Known environment/config blockers

- Vitest JSX tests reference `vi`, but flat ESLint config currently exposes Jest globals only.
- `src/service-worker.ts` references service-worker global names that are not declared for lint.
- Some DOM type names are flagged by `no-undef` in TS files even though TypeScript owns them.
- Backend files emit flat-config warnings for legacy `/* eslint-env */` comments.
- `src/pages/__tests__/OAuth2Consent.a11y.test.jsx` has a parse blocker that also affects Vitest.

## Owner/date placeholders

| Debt area | Owner placeholder | Target date placeholder | Gate |
| --- | --- | --- | --- |
| Legacy React prop-types policy | Frontend Platform | 2026-06-30 | Lint ratchet if not fully green. |
| Unused vars across legacy source | Frontend + Backend Platform | 2026-06-30 | Lint ratchet if not fully green. |
| Hook dependency review | Frontend Platform | 2026-07-15 | Warnings tracked; behavior-sensitive fixes require tests. |
| TypeScript `any` migration | TypeScript Migration Owner | 2026-07-31 | Existing TS ratchet plus lint ratchet. |
