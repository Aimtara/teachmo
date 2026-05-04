# SWOT Closure — Production Readiness Hardening

Generated: 2026-05-03

## Strengths

| Strength | Preserved? | Strengthened? | Evidence | Remaining gap |
| --- | --- | --- | --- | --- |
| Enterprise infrastructure | Yes | Yes | Nhost/Hasura config safety, release contract, deterministic CI/Docker review. | Live staging/prod project verification. |
| AI safety/orchestration | Yes | Partial | PII logging and observability docs include AI prompt/vendor payload controls. | Live AI vendor DPA and adversarial test evidence. |
| Documentation/testing culture | Yes | Yes | New runbooks, evidence templates, script tests, readiness docs. | Assign human owners/dates. |
| Quality gates | Yes | Yes | Secret hygiene, Nhost config safety, Hasura readiness, TS ratchet, PII logging, boundary checks. | Full lint/Vitest/bundle remain not green. |
| Security posture | Yes | Yes | Removed tracked OAuth secret-looking value; safe Nhost deploy config; fail-closed smoke guidance. | Secret rotation and live RBAC evidence. |
| Observability/resilience | Yes | Yes | Redaction tests, SLO runbook, evidence templates for incident/rollback/backup. | Real alert routing and drills. |

## Weaknesses

| Weakness | Addressed? | Evidence | Remaining work |
| --- | --- | --- | --- |
| JS/TS transitional state | Partial | TS ratchet passes with new TS domain modules. | Continue JSX-to-TS migration slices. |
| Lingering non-MVP code | Not addressed | Scope intentionally avoided deleting functionality. | Product decision needed to retire non-MVP routes safely. |
| Operational overhead | Partial | Release contract and evidence templates make operations executable. | Staff ownership/on-call assignment. |
| Lint failures | Partial | Touched files validated by typecheck/smoke; debt documented. | Fix 3462 pre-existing lint errors or introduce formal lint ratchet. |
| Bundle budget | Partial | Vendor chunking exposes large dependencies; budget still fails. | Lazy-load/heavy dependency reduction or approval to revise budget. |
| Risky Nhost/Hasura config | Addressed in code | `nhost/nhost.toml` safe-by-default; local example separated. | Live Nhost dashboard verification. |
| Nondeterministic Docker | Partial | Docker build uses `npm ci`; global `serve` removed. | Provider runtime verification. |

## Opportunities

| Opportunity | Captured? | Implemented? | Remaining opportunity |
| --- | --- | --- | --- |
| Release gates as contract | Yes | Yes | `docs/runbooks/release-contract.md`; scripts/workflows wired. | Make CI fully green by resolving pre-existing blockers. |
| Project Melorean architecture roadmap | Yes | Partial | API-boundary exceptions reduced 44→40 and documented. | Continue domain adapter extraction. |
| Institutional procurement readiness | Yes | Partial | Security/config/RBAC evidence requirements documented. | Complete compliance/legal/vendor reviews. |
| PWA/offline confidence | Yes | Partial | Evidence templates and release checklist include PWA/offline recovery. | Add browser-driven offline tests. |
| Measurable production milestones | Yes | Yes | Manual register and evidence templates define proof artifacts. | Assign owners/dates and capture live evidence. |

## Threats

| Threat | Mitigated? | Residual risk | Next action |
| --- | --- | --- | --- |
| Data privacy/PII | Partial | Broad legacy logging allowlists remain. | Continue logger migration and live audit review. |
| Scope creep | Partial | Final recommendation remains controlled pilot only. | Product owner to define MVP route inventory. |
| Auth bypass | Yes in code | CI test bypass remains by design. | Verify staging/prod env variables with runbook. |
| Permission smoke skipping | Yes | Fork PRs may skip intentionally. | Require live smoke for protected launches. |
| Force-push release script | Yes | Legacy force-push script exits with warning. | Remove entirely after pilot process approval. |
| Migration ownership complexity | Partial | Runbooks clarify Nhost/Hasura/backend sequencing. | Assign migration owners and perform staging rehearsal. |

## May 4 closure update

| Category | Updated status | Evidence | Remaining work |
| --- | --- | --- | --- |
| Strength: quality gates | Strengthened | API-boundary exception cap tightened to 30; bundle ratchet tightened to 599/23/214; browser E2E and unit a11y commands now pass in scoped local automation. | Continue full-lint cleanup under ratchet. |
| Weakness: browser QA | Addressed for local smoke | `npm run test:e2e`: 7 passed / 5 credential-environment skips; `npm run test:a11y`: 22 passed. | Live role, SSO, SCIM, and production-preview PWA evidence remain manual. |
| Opportunity: Melorean/domain architecture | Captured | Partner, directory, AI transparency, execution board, audit-log, and AI simulation calls now use domain adapters; exceptions reduced 37 → 30. | Remaining admin/AI prompt/discover/hook adapters. |
| Threat: auth bypass ambiguity | Mitigated further | Playwright runs with explicit test-only bypass/env flags; route security dev bypass is disable-able; non-admin Ops smoke now proves block behavior. | Verify staging/prod env flags with Nhost/Hasura evidence templates. |
