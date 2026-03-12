# JavaScript → TypeScript Migration Plan

## 1) Migration objectives

- Move the repository from mixed JavaScript/TypeScript to **TypeScript-first**, with JavaScript only allowed in explicitly exempt legacy or generated areas.
- Preserve production behavior during migration (no large freeze or long-lived branch).
- Raise static safety gradually: type coverage, stricter compiler settings, and CI enforcement.
- Keep delivery velocity by migrating in vertical slices with clear ownership and measurable checkpoints.

## 2) Current-state assessment (baseline)

> Baseline from tracked source files (`git ls-files '*.js' '*.jsx' '*.ts' '*.tsx'`).

- `512` `.jsx` files
- `224` `.js` files
- `250` `.ts` files
- `35` `.tsx` files

Additional context:

- TypeScript is already enabled with `strict: true`, `allowJs: true`, and `checkJs: true`.
- Typecheck scope is currently limited by `tsconfig.typecheck.json` include paths.
- ESLint and test tooling already understand `.ts/.tsx`.

## 3) Guiding principles

1. **No big-bang rewrite**: migrate incrementally with production-safe PRs.
2. **Boy scout rule**: any touched JS/JSX file should be converted in the same PR when practical.
3. **Prefer inference, avoid over-annotation**: start with useful boundary types, then deepen.
4. **Type boundaries first**: APIs, shared utilities, state contracts, and cross-module interfaces.
5. **CI gates ratchet upward**: enforce trends, not immediate perfection.

## 4) Target end-state definition

A migration is complete when all of the following are true:

- All application/runtime source under `src/` is `.ts/.tsx` (exceptions documented).
- Backend Node code under `backend/` is `.ts` or intentionally exempt (with owner + retirement date).
- Build and config scripts are TypeScript-compatible or documented as JS-only exceptions.
- `allowJs` is disabled in the primary TypeScript config.
- `tsc --noEmit` runs against full intended application scope in CI.
- ESLint disallows new `.js/.jsx` files in migrated directories.

## 5) Phased implementation plan

### Phase 0 — Inventory, ownership, and migration mechanics (Week 1)

**Deliverables**

- Create a migration tracker (spreadsheet or issue board) with per-directory status:
  - `owner`
  - `file count`
  - `risk level`
  - `blocked by`
  - `target sprint`
- Define conversion order by blast radius:
  1. shared types/utilities
  2. hooks/state
  3. core UI components
  4. pages/routes
  5. backend routes/services
  6. tests and tooling leftovers
- Publish naming and conversion standards (see Section 7).

**Execution tasks**

- Run and store per-directory file counts (JS vs TS).
- Mark generated/vendor-like paths as temporary exclusions.
- Align domain owners for each top-level area (`src`, `backend`, `tests`, `scripts`, `config`).

### Phase 1 — Foundation hardening (Week 1–2)

**Deliverables**

- Establish foundational shared types and conventions:
  - API request/response contracts
  - domain entity types
  - global utility types (`Result`, paginated response shapes, etc.)
- Add typed wrappers at critical boundaries:
  - HTTP/fetch clients
  - database adapters
  - feature-flag and config readers

**Execution tasks**

- Create/normalize `src/types/` ownership model.
- Replace weak dynamic contracts (`any`/implicit object maps) with explicit interfaces or `zod` schemas + inferred types.
- Ensure TypeScript path aliases and module boundaries are consistently used.

### Phase 2 — Frontend migration by vertical slices (Week 2–6)

**Deliverables**

- Convert `src/**/*.jsx` → `src/**/*.tsx` and `src/**/*.js` → `src/**/*.ts` in prioritized slices.
- Ensure each migrated slice passes lint, tests, and typecheck.

**Suggested slice order**

1. `src/lib`, `src/utils`, shared helpers
2. `src/hooks` and state stores
3. `src/components/shared` and design-system primitives
4. feature components by domain
5. route/page containers

**Execution tasks per slice**

- Rename files (`.jsx`→`.tsx`, `.js`→`.ts`) with import updates.
- Add props interfaces/types, component return types where needed.
- Type custom hooks and context providers.
- Replace runtime-only prop assumptions with typed guards.
- Remove `@ts-ignore` introduced during fast conversion within the same slice whenever feasible.

### Phase 3 — Backend/service layer migration (Week 4–8; overlaps Phase 2)

**Deliverables**

- Convert backend JS routes/services to `.ts` with typed request/response contracts.
- Type external integration boundaries (auth, email, third-party APIs, DB access).

**Execution tasks**

- Prioritize backend modules by traffic and incident history.
- Introduce typed middleware context and request augmentation types.
- Consolidate shared backend types to avoid drift.
- Where runtime validation exists, infer TS types from validation schemas.

### Phase 4 — Tests, tooling, and config convergence (Week 6–9)

**Deliverables**

- Migrate remaining test suites and helpers to TypeScript where practical.
- Convert or document JS config/scripts exceptions.
- Ensure Storybook/Vitest/Jest/Playwright remain green under TS-first workflow.

**Execution tasks**

- Convert test helpers/mocks to typed factories.
- Remove brittle implicit `any` fixtures.
- Keep config files in JS only if ecosystem support is better in JS (document each exception).

### Phase 5 — Enforcement and deprecation of JS path (Week 8–10)

**Deliverables**

- CI gates prevent regression into JS in migrated paths.
- `allowJs` disabled (or set false in target tsconfig used by CI).
- Typecheck scope expanded to full target source set.

**Execution tasks**

- Add lint rule/pattern checks to block new JS/JSX in migrated directories.
- Add CI metric checks (see Section 6) and failing thresholds.
- Remove transitional aliases and temporary shims.

## 6) Migration KPIs and quality gates

Track weekly:

- **JS/JSX file count trend** (must decrease every sprint).
- **Typecheck error trend** (must decrease sprint-over-sprint).
- **`any` count trend** (`any`, `@ts-ignore`, `@ts-expect-error`).
- **Runtime incident rate** in migrated modules vs baseline.
- **PR cycle time** to ensure migration overhead stays acceptable.

Recommended CI gates (ratcheting):

1. Fail if JS/JSX count increases in migrated directories.
2. Fail if `@ts-ignore` count increases beyond allowed temporary budget.
3. Fail if `tsc --noEmit` errors increase against baseline.
4. Fail if lint/test/typecheck bundle fails.

## 7) Coding standards for conversion

- Prefer `type` for unions/compositions and `interface` for extendable object contracts (or team-standard; choose one and enforce consistently).
- Avoid `any`; use `unknown` + narrowing where needed.
- Type all exported functions, public hooks, component props, and context values.
- Introduce discriminated unions for state machines / async status handling.
- Use `satisfies` for config-like objects to preserve inference and enforce shape.
- Keep runtime validation for untrusted input; do not treat TypeScript as runtime safety.

## 8) Risk management and mitigation

### Major risks

- **Velocity drop** from broad touch surface.
- **Type churn** due to unstable domain contracts.
- **False confidence** if type coverage grows but runtime validation shrinks.
- **Merge conflicts** in high-churn directories.

### Mitigations

- Limit PR size per slice (e.g., 20–40 files unless mechanical rename-only).
- Freeze high-volatility refactors during core slice migrations.
- Pair migration with contract tests for critical flows.
- Use codemods for repetitive conversions and import rewrites.
- Enforce frequent rebases for long-running slice branches.

## 9) Suggested work breakdown structure (WBS)

- **Workstream A: Standards & Tooling**
  - tsconfig tightening roadmap
  - ESLint rule hardening
  - CI metric scripts
- **Workstream B: Frontend Core**
  - shared types/utils/hooks/components
- **Workstream C: Feature Domains**
  - migrate page + components + hooks per domain
- **Workstream D: Backend**
  - routes, services, integration clients, middleware types
- **Workstream E: QA & Reliability**
  - contract tests, regression checks, release monitoring

Each workstream should have a directly responsible individual (DRI), sprint commitment, and explicit done criteria.

## 10) Operational migration checklist (per PR)

- [ ] Renamed files use `.ts/.tsx` and imports resolve.
- [ ] No new `any`/`@ts-ignore` unless justified in PR notes.
- [ ] Lint passes.
- [ ] Typecheck passes for relevant scope.
- [ ] Unit/integration tests for changed areas pass.
- [ ] Migration tracker updated (file counts and status).

## 11) Exit criteria and handoff

Before declaring migration complete:

- Run a final JS/JSX inventory and verify only approved exceptions remain.
- Validate `allowJs: false` workflow in CI and local dev.
- Confirm runbooks/onboarding docs are updated for TS-first contribution.
- Archive migration tracker with before/after metrics and lessons learned.

---

## Appendix A — Recommended command set for execution tracking

```bash
# overall file-type baseline
git ls-files '*.js' '*.jsx' '*.ts' '*.tsx' | awk -F. '{print $NF}' | sort | uniq -c

# JS/JSX inventory by top-level directory (tracked files only)
git ls-files '*.js' '*.jsx' | awk -F/ '{print $1}' | sort | uniq -c

# typecheck/lint/test gates
npm run typecheck
npm run lint
npm run test -- --run
```

## Appendix B — Exception policy template

For each temporary JavaScript exception capture:

- Path
- Owner
- Reason
- Risk impact
- Target removal date
- Tracking issue link
