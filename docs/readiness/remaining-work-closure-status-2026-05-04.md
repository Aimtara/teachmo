# Teachmo Remaining-Work Closure Plan — Progress Readout (May 4, 2026)

## Executive status

Overall plan status: **In progress (early-to-mid execution)**.

- The repo has clear readiness scaffolding, checks, and prior hardening documentation.
- The closure plan itself is only **partially executed**: baseline signals exist, but several phase deliverables/doc artifacts are still absent.
- Gate closure remains uneven: Gate 0/1 closed; Gate 2/3/4 still open based on existing board/readout evidence.

## Current measured snapshot (this review)

- HEAD: `1904603`
- Node/npm observed in current environment: `v22.21.1` / `11.4.2` (plan baseline expected Node 20)
- `check:api-boundaries`: **passes with 44 temporary exceptions**
- `npm audit --audit-level=high --json`: **fails** with 25 vulnerabilities (12 high, 11 moderate, 2 low)
- `check:lint-ratchet`: **script missing** in current package scripts (ratchet tooling appears to have shifted to other checks, e.g. `check:ts-ratchet`)

## Phase-by-phase plan progress

### Phase 1 — Fresh baseline and documentation
**Status: Partially complete**

What is addressed:
- Baseline-oriented readiness docs exist (`production-readiness-readout`, `production-hardening-status`, manual work register).
- Some operational checks are runnable and documented in-repo.

What is missing/gap:
- The specific requested new docs are not present yet:
  - `docs/readiness/remaining-work-closure-plan.md`
  - `docs/readiness/gate-audit-closure.md`
- A single consolidated before/after baseline table for the closure plan is not yet present.

### Phase 2 — Dependency security burn-down
**Status: In progress (not closed)**

What is addressed:
- Audit visibility is present and reproducible.
- High-risk packages are identifiable from audit output.

What is missing/gap:
- High vulnerabilities still present (12 high).
- No committed `check:audit` gate + exception policy file observed from this review scope.
- No evidence yet in docs/readout that all high vulnerabilities are removed or formally exceptioned with expiry metadata.

### Phase 3 — Lint burn-down
**Status: Blocked / partial**

What is addressed:
- Lint script exists.

What is missing/gap:
- The plan’s lint-ratchet command (`check:lint-ratchet`) is currently missing as a package script in this repo state.
- No current closure artifact found in `docs/readiness/` summarizing parser/no-undef reductions versus baseline.

### Phase 4 — API-boundary exception burn-down
**Status: In progress**

What is addressed:
- Checker is in place and passing.
- Exceptions are explicitly documented inline with owners/targets/reasons.

What is missing/gap:
- Exception count is **44**, indicating burn-down is not yet complete and likely regressed versus the plan’s “40 documented exceptions” starting point.
- No dedicated `docs/readiness/api-boundary-exceptions.md` closure ledger found.

### Phase 5 — Bundle policy and safe reductions
**Status: Partially complete**

What is addressed:
- `check:size` script exists.
- Prior readiness docs include bundle context and policy discussion.

What is missing/gap:
- No dedicated `docs/readiness/bundle-size-plan.md` found.
- Current run evidence in this review does not include updated size outputs and ratchet deltas.

### Phase 6 — Manual production readiness evidence
**Status: In progress**

What is addressed:
- `docs/readiness/manual-production-work.md` exists.
- Production-readiness readout already acknowledges manual/live-environment dependencies.

What is missing/gap:
- No new evidence templates found for several requested items (command-center live proof template, browser readiness template, etc.).
- Live tasks remain appropriately incomplete, but closure packet expansion appears unfinished.

### Phase 7 — Browser E2E and a11y validation
**Status: Not confirmed in this review**

What is addressed:
- Browser/a11y scripts exist (`test:a11y`, `e2e:a11y`, `e2e`).

What is missing/gap:
- No fresh evidence artifact found at `docs/readiness/browser-e2e-a11y-readiness.md`.
- No current execution results captured in this review cycle.

### Phase 8 — Gate 2 (Integrations/Directory)
**Status: In progress, not closed**

What is addressed:
- Existing directory/import/approval infrastructure is present in codebase.

What is missing/gap:
- Prior gate assessments still classify E10/E11/E12 as partial and E13 as not started.
- No new closure evidence document found showing E13 moved to v0 implemented/gated state.

### Phase 9 — Gate 3 (Messaging/Assignments/Scheduling)
**Status: In progress, not closed**

What is addressed:
- Messaging and assignment surfaces exist; retry/digest structures exist in parts of stack.

What is missing/gap:
- Prior gate assessments still classify E14/E15/E17 as partial and E16 as not started.
- Office hours remains the key unresolved hotspot in closure plan terms.

### Phase 10 — Gate 4 (Analytics/Admin)
**Status: In progress, not closed**

What is addressed:
- Admin/analytics surfaces and checks exist.

What is missing/gap:
- Prior assessments still classify E18/E20/E22/E23 as partial/stubbed.
- API-boundary exceptions remain concentrated on admin pages, indicating this phase is not closure-ready.

### Phase 11 — Final validation
**Status: Not started (as a full closure suite)**

What is addressed:
- Many individual commands exist.

What is missing/gap:
- No evidence in this review that the full final validation matrix was run and passed as a single closure checkpoint.

### Phase 12 — Final documentation, commit, push, readout
**Status: Partially complete**

What is addressed:
- Multiple dated readiness/review readouts exist.

What is missing/gap:
- Several specific closure docs listed in the plan are still missing in `docs/readiness/`.
- Closure pack is not yet complete enough to claim the plan fully executed.

## Gate summary (from current documented state)

- **Gate 0:** Complete
- **Gate 1:** Complete
- **Gate 2:** Open (E13 still key blocker)
- **Gate 3:** Open (E16 still key blocker)
- **Gate 4:** Open (admin evidence + boundary exception burn-down incomplete)

## SWOT follow-through (what is addressed vs not)

### Addressed from SWOT themes
- **Strengths (execution foundation):** logging, perf/accessibility baseline, schema/health and identity controls are in place from prior gate closures.
- **Threat mitigation (security/compliance baseline):** tenant scoping, RBAC, and audit logging are in place; this materially reduces cross-tenant/compliance risk.

### Partially addressed
- **Weaknesses (operational rigor, tooling debt):** work is underway but unresolved (audit highs, lint/ratchet drift, API-boundary exceptions).
- **Opportunities (pilot/enterprise acceleration):** partially unlocked, but Gate 2/3/4 closure evidence and admin hardening are still needed.

### Not yet addressed enough to claim closure
- Full dependency high-vuln closure or approved exceptions framework.
- Meaningful API-boundary exception burn-down on admin/integration hotspots.
- E13 deterministic identity mapping and E16 office hours v0/gating evidence.
- Full closure documentation packet and final validation matrix execution.

## Recommended next 2-week execution sequence

1. **Stabilize baseline tooling first (Phase 1/3):** restore/align lint ratchet command strategy and publish one closure baseline table.
2. **Close security gate mechanics (Phase 2):** add `check:audit` + explicit exception policy with expiry/owner fields.
3. **Burn down admin/API exceptions (Phase 4 + Phase 10 overlap):** prioritize AdminAnalytics, AdminSISSync, AdminSystemHealth, SchoolDirectoryAdmin.
4. **Unblock gate-critical “not started” items (Phase 8/9):** publish explicit E13/E16 implementation-or-gating decision docs.
5. **Publish missing closure docs (Phase 12) before claiming readiness closure.**
