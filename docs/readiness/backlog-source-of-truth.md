# Backlog Source of Truth & Burndown Tracker

_Last refreshed: 2026-05-05_

This tracker is the canonical burn-down artifact for documented work in this repository. It consolidates every known backlog-style source (epics, checklists, remediation plans, migration plans, issue pack tasks, and evidence templates) into one operational view.

## Status Legend

- **Not started**
- **In progress**
- **Blocked / external dependency**
- **Complete**

## 1) Backlog Inventory Coverage (all documented task sources)

| Source document | Task format | Open | Complete | Progress | Last worked date (from source) | Notes |
| --- | --- | ---: | ---: | ---: | --- | --- |
| `docs/execution-board.md` | Gate checklist items | 12 | 8 | 40.0% | 2026-03-23 | Gate 0/1 complete; Gate 2/3/4 pending checklist closeout. |
| `docs/typescript-migration-tracker.md` | Phase checklist items | 2 | 59 | 96.7% | 2026-05-03 | Only two active continuation items remain unchecked. |
| `docs/readiness/automation-implementation-tracker.md` | GO/NO-GO closure checklist | 25 | 3 | 10.7% | 2026-05-05 | Major automation debt remains across CI/security/browser/governance. |
| `docs/teachmo-github-issue-pack.md` | Issue pack master checklist | 243 | 1 | 0.4% | 2026-05-05 | Largest backlog pool; requires staged triage and sequencing. |
| `docs/readiness/evidence/admin-sync-dashboard-validation-template.md` | Evidence checklist | 3 | 0 | 0% | 2026-05-05 | Manual evidence artifact; no completed entries yet. |
| `docs/readiness/evidence/oauth-secret-rotation-template.md` | Evidence checklist | 6 | 0 | 0% | 2026-05-05 | Credential/manual approval dependent. |
| `docs/readiness/evidence/permission-smoke-template.md` | Evidence checklist | 2 | 0 | 0% | 2026-05-05 | Pending execution and signoff. |
| `docs/readiness/open-findings-remediation-plan.md` | Quantified findings backlog | 4 findings streams open | — | — | 2026-05-04 | API boundaries, lint, audit, manual/live evidence. |
| `docs/readiness/technical-blocker-burndown.md` | Milestone phases + debt targets | 3 unresolved debt lines | 7 phases complete | 70.0% (phase view) | 2026-05-04 | Execution blockers closed; residual debt explicitly tracked. |

## 2) Consolidated Program & Product Delivery Backlog

| Workstream | Scope | Progress | Status | Last worked date | Tentative start date | Target completion date | Completed date |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Gate 0 (Foundation) | E01, E02, E03, E04, E19 | 5/5 (100%) | Complete | 2026-03-23 | 2026-03-01 | 2026-03-23 | 2026-03-23 |
| Gate 1 (Identity/Tenancy) | E05, E06, E07 | 3/3 (100%) | Complete | 2026-03-23 | 2026-03-08 | 2026-03-23 | 2026-03-23 |
| Gate 2 (Integrations/Directory) | E10, E11, E12, E13 | 0/4 (0%) checklist complete | In progress | 2026-03-23 | 2026-03-24 | 2026-05-31 | — |
| Gate 3 (Messaging/Assignments/Scheduling) | E14, E15, E16, E17 | 0/4 (0%) checklist complete | In progress | 2026-03-23 | 2026-04-01 | 2026-06-15 | — |
| Gate 4 (Analytics/Admin/Growth) | E18, E20, E22, E23 | 0/4 (0%) checklist complete | In progress | 2026-03-23 | 2026-04-15 | 2026-06-30 | — |
| Enterprise hardening | E25 (+ E08, E09, E21, E24 dependencies) | 0/1 (0%) | Not started | 2026-03-23 | 2026-06-15 | 2026-08-31 | — |

## 3) Consolidated Readiness & Repository-Health Backlog

| Backlog item | Progress | Status | Last worked date | Tentative start date | Target completion date | Completed date | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| API-boundary exception removal | 0/30 removed from open-findings baseline | In progress | 2026-05-04 | 2026-05-05 | 2026-06-15 | — | Execute A1→A7 batches, lower exception cap after each batch. |
| Full lint cleanup | Ratcheted; full lint still non-zero | In progress | 2026-05-04 | 2026-05-05 | 2026-06-30 | — | Keep ratchet green while reducing baseline to 0. |
| Raw npm audit cleanup | 10 findings / 4 high (dev/optional chains) | Blocked / external dependency | 2026-05-04 | 2026-05-05 | 2026-06-30 | — | Runtime audit clean; full audit needs dependency remediation/approval. |
| Manual/live production evidence closure | 0/31 complete | Blocked / external dependency | 2026-05-04 | 2026-05-05 | 2026-07-15 | — | Requires credentials/vendor/legal/human signoff. |
| Technical blocker residual debt: lint policy | Ratchet installed; debt remains | In progress | 2026-05-03 | 2026-05-03 | 2026-06-30 | — | Frontend Platform owner placeholder. |
| Technical blocker residual debt: bundle reduction | Ratchet installed; debt remains | In progress | 2026-05-03 | 2026-05-03 | 2026-06-15 | — | Web Performance owner placeholder. |
| Technical blocker residual debt: API-boundary temp exceptions | Ratchet installed; debt remains | In progress | 2026-05-03 | 2026-05-03 | 2026-07-15 | — | Platform owners in exception register. |

## 4) Automation & Governance Backlog (execution view)

- Overall checklist progress (`automation-implementation-tracker`): **3 / 28 complete (10.7%)**.

| Area | Complete | Total | Progress | Status | Last worked date | Tentative start date | Target completion date |
| --- | ---: | ---: | ---: | --- | --- | --- | --- |
| Dependency/security automation | 0 | 4 | 0% | Not started | 2026-05-05 | 2026-05-06 | 2026-05-20 |
| API boundary automation | 1 | 4 | 25% | In progress | 2026-05-05 | 2026-05-06 | 2026-05-20 |
| Lint ratchet automation | 0 | 3 | 0% | Not started | 2026-05-05 | 2026-05-13 | 2026-05-27 |
| Bundle budget automation | 1 | 3 | 33.3% | In progress | 2026-05-05 | 2026-05-13 | 2026-05-27 |
| Metadata/schema validation automation | 0 | 3 | 0% | Not started | 2026-05-05 | 2026-05-20 | 2026-06-03 |
| Browser quality automation | 0 | 3 | 0% | Not started | 2026-05-05 | 2026-05-20 | 2026-06-03 |
| Collaboration/governance automation | 0 | 3 | 0% | Not started | 2026-05-05 | 2026-05-27 | 2026-06-10 |
| Synthetic monitoring automation | 0 | 3 | 0% | Not started | 2026-05-05 | 2026-05-27 | 2026-06-10 |
| Evidence templates completion (`docs/readiness/evidence/*`) | 0 | 11 | 0% | Not started | 2026-05-05 | 2026-05-27 | 2026-06-17 |

## 5) TypeScript Migration Backlog (timeline view)

| Track | Progress | Status | Last worked date | Tentative start date | Target completion date | Completed date |
| --- | --- | --- | --- | --- | --- | --- |
| Phase 0 kickoff checklist | 4/4 (100%) | Complete | 2026-05-03 | 2026-05-01 | 2026-05-03 | 2026-05-03 |
| Phase 1 foundation hardening | 31/32 listed items complete | In progress | 2026-05-03 | 2026-05-01 | 2026-06-30 | — |
| Phase 2 frontend vertical-slice kickoff | Active with one continuation item open | In progress | 2026-05-03 | 2026-05-03 | 2026-08-31 | — |
| Recommended slice: Admin GraphQL pages | 0% | Not started | 2026-05-03 | 2026-05-15 | 2026-07-15 | — |
| Recommended slice: Partner portal REST pages | 0% | Not started | 2026-05-03 | 2026-05-22 | 2026-07-31 | — |
| Recommended slice: Backend route contracts | 0% | Not started | 2026-05-03 | 2026-06-01 | 2026-08-15 | — |
| Recommended slice: Nhost shared utilities | 0% | Not started | 2026-05-03 | 2026-06-15 | 2026-08-31 | — |

## 6) Immediate Priority Queue (next burn-down moves)

1. Triage `docs/teachmo-github-issue-pack.md` into execution batches and assign owners/dates for the first 25 items.
2. Execute API-boundary Batch A1 and lower exception cap.
3. Add and wire `check:audit` in package scripts + CI.
4. Publish/update `docs/readiness/api-boundary-exceptions.md` with explicit owner/date/risk for all remaining exceptions.
5. Start first mechanical lint cleanup batch and reduce ratchet baseline.
6. Add metadata drift and migration consistency CI checks.
7. Add Playwright critical-flow smoke job in CI.
8. Add automated a11y smoke CI job.
9. Add/verify CODEOWNERS readiness-critical coverage and PR evidence checklist enforcement.
10. Close first manual evidence templates batch (permissions, admin sync dashboard, secret rotation).

## 7) Update Protocol

1. Refresh this tracker at least twice weekly and at each release-readiness checkpoint.
2. Keep date fields explicit (`YYYY-MM-DD`) and update `last worked` every touch.
3. Do not mark progress without linked source-document evidence.
4. When source documents change, update Inventory Coverage first, then downstream tables.
5. Treat this file as canonical for burndown reporting; source docs remain implementation detail.
