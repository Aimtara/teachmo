# Technical Blocker Burn-down

Generated: 2026-05-03  
Baseline commit: `3ec8509`

## Executive summary

This register tracks the dedicated burn-down for the four remaining repository-health blockers:

- `npm run lint`
- `npm run test -- --run`
- `npm run check:size`
- `cd backend && npm test`

Execution baseline confirms the blockers are pre-existing and reproducible. Root backend Jest, typecheck, smoke tests, and fast production static checks are green. The remediation strategy is to fix low-risk configuration and test-discovery issues first, then either reach full green or install controlled ratchets with exact counts and release-gate protections where broad legacy remediation is too risky for one pass.

## Baseline environment

| Item | Value |
| --- | --- |
| Node | `v20.20.2` |
| npm | `10.8.2` |
| Clean install | `npm ci` passed; 25 audit findings reported by npm |
| Baseline branch | `main` |
| Baseline commit | `3ec8509` |

## Blocker status

| Blocker | Baseline result | Count / size | Primary category | Fix strategy |
| --- | --- | ---: | --- | --- |
| `npm run lint` | FAIL | 3,622 problems (3,465 errors, 157 warnings) | Lint config, safe mechanical debt, broad legacy policy debt | Fix config/parsing/no-undef first; pursue full green where safe; otherwise add strict lint ratchet with owner/date placeholders. |
| `npm run test -- --run` | FAIL | 25 failed files, 32 failed tests | Test discovery, mock-shape issues, stale expectations | Exclude wrong-runner tests and nested dependencies; fix Vitest mocks and verified stale expectations. |
| `npm run check:size` | FAIL | 613.92 kB brotlied vs 500 kB budget | Bundle budget / aggregate JS measurement | Reduce app shell where safe; if all-JS budget is not meaningful, install app-shell/per-chunk/total-growth gates. |
| `cd backend && npm test` | FAIL | 15 failed suites | Backend package Jest config | Align backend package script with root backend Jest config that already passes. |

## Supporting checks

| Command | Baseline result | Notes |
| --- | --- | --- |
| `npm ci` | PASS | Install completed with existing audit findings. |
| `npm run test:backend` | PASS | 30 suites / 186 tests. |
| `npm run typecheck` | PASS | TypeScript check green. |
| `npm run build` | PASS | Vite build succeeds; size check fails after build. |
| `npm run test:smoke` | PASS | 5 files / 15 tests. |
| `npm run check:production:fast` | PASS | Static production-readiness checks pass with 40 documented API-boundary exceptions. |

## Failure categorization

| Category | Representative evidence | Priority | Recommended strategy |
| --- | --- | --- | --- |
| Quick safe fixes | Backend package uses divergent Jest config while root backend config passes | P0 | Reuse root backend Jest config from `backend/package.json`. |
| Test discovery issues | Vitest discovers `nhost/functions/node_modules/**`, `tests/e2e/**`, `src/components/testing/specs/**` | P0 | Tighten `vitest.config.ts` excludes before editing tests. |
| Legacy mock-shape issues | Governance event and GraphQL helpers are not spies under Vitest | P0 | Convert affected tests to explicit `vi.mock` / `vi.fn` mock factories. |
| Stale test expectations | AuthGuard, websocket fallback, auth profile fallback | P1 | Inspect source and existing characterization tests before updating test or source. |
| Lint config/environment issues | `vi` undefined, service-worker globals undefined, backend flat-config env warnings | P0 | Add scoped ESLint globals/overrides. |
| Safe mechanical lint fixes | Unused imports/vars in touched files | P1 | Fix when files are touched by test/config work. |
| Risky lint/refactor debt | 2,414 `react/prop-types`, 667 unused vars, hook dependency warnings | P2 | Ratchet if full cleanup is unsafe in one pass. |
| Bundle architecture/code splitting | `vendor-misc` 840.49 kB raw, `vendor-visualization` 339.87 kB raw, app-shell index 95.93 kB raw | P1 | Inspect heavy eager imports; lazy-load safe widgets/providers. |
| Bundle budget decision | Current size-limit aggregates `dist/assets/**/*.js` | P1 | Prefer app-shell/per-chunk/total-growth gates if 500 kB total JS is not product-appropriate. |
| External/live blockers | Full launch/production may require live credentials | P3 | Document separately if encountered during final validation. |

## Phase status

| Phase | Status | Evidence |
| --- | --- | --- |
| 1. Baseline | Complete | Execution baseline captured in this document and supporting readiness docs. |
| 2. Backend package Jest | Pending | Next remediation phase. |
| 3. Full Vitest | Pending | Discovery and mock-shape issues identified. |
| 4. Lint | Pending | Baseline count captured; policy decision may be needed. |
| 5. Bundle size | Pending | Build output and size-limit failure captured. |
| 6. Integration validation | Pending | To run after fixes. |
| 7. Final docs/readout | Pending | Docs will be updated with after-state evidence. |

## Owner/date placeholders for unresolved baseline debt

| Debt area | Owner placeholder | Target date placeholder | Gate |
| --- | --- | --- | --- |
| Legacy lint policy debt | Frontend Platform Owner | 2026-06-30 | Full lint or lint ratchet / production lint gate |
| Full Vitest failures | QA / Frontend Platform Owner | 2026-05-17 | `npm run test -- --run` |
| Backend package Jest | Backend Platform Owner | 2026-05-10 | `cd backend && npm test` |
| Bundle budget decision | Web Performance Owner | 2026-05-17 | `npm run check:size` or replacement strict budget gate |
