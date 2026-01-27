# Teachmo Execution Board (Single Source of Truth)

## A) Workstream Epics (25 items)

**Legend**
- **Tags:** MVP shipping / Pilot hardening / Enterprise scale / R&D
- **Risk flags:** integration risk / compliance risk / performance risk
- **Rail segments:** Foundation → Identity → Integrations/Directory → Messaging/Assignments/Scheduling → Analytics/Admin → Growth layers

> The board below is the single set of epics. The two views in section **B** are just filters/ordering of the same IDs.

| ID | Epic | Tag | Owner | Rail segment | Dependencies (upstream → downstream) | Exit criteria (Definition of Done) | Risk flags |
| --- | --- | --- | --- | --- | --- | --- | --- |
| E01 | Global error handling + structured logging | MVP shipping | Maya (Eng Lead) | Foundation | Upstream: — → Downstream: E02, E03, E04, E19 | Errors are captured with request IDs, role, tenant, and surface; logs are queryable by severity and tenant; 0 unhandled exceptions in core flows during test run. | performance risk |
| E02 | Performance baseline + cold start guardrails | MVP shipping | Luis (Eng Lead) | Foundation | Upstream: E01 → Downstream: E14, E15, E17 | Core screens load within defined budgets (P75 < 2s on staging); cold start within acceptable threshold; regressions fail CI perf budget. | performance risk |
| E03 | Accessibility baseline (core screens) | MVP shipping | Priya (PM) | Foundation | Upstream: E01 → Downstream: E14, E15, E16 | WCAG AA checks pass for onboarding, parent dashboard, messaging; keyboard flows verified; accessibility test checklist signed. | compliance risk |
| E04 | Analytics event schema v0 | MVP shipping | Jonah (Eng Lead) | Foundation | Upstream: E01 → Downstream: E18, E20 | Event schema documented and enforced in code; events include role, tenant, school, surface, metadata; events emitted for onboarding, messaging, digest. | performance risk |
| E05 | Core roles + RBAC enforcement | MVP shipping | Serena (PM) | Identity | Upstream: E01 → Downstream: E06, E07, E10, E14 | Roles (parent/teacher/admin/partner) enforced in API + UI; unauthorized attempts blocked + logged; role tests pass. | compliance risk |
| E06 | Tenant scoping hardening | MVP shipping | Victor (Eng Lead) | Identity | Upstream: E05 → Downstream: E07, E10, E12 | Tenant boundaries enforced in queries and APIs; no cross-tenant data access in automated tests; scoped data filters in UI. | compliance risk |
| E07 | Audit log for sensitive actions | MVP shipping | Serena (PM) | Identity | Upstream: E05, E06 → Downstream: E18, E24 | Audit records include actor, action, object, before/after; exportable and filterable; admin UI exposes audit search. | compliance risk |
| E08 | SSO (SAML/OIDC) v0 | Enterprise scale | Alex (Eng Lead) | Identity | Upstream: E05, E06 → Downstream: E09, E25 | SSO config supported for at least one provider; login flow works for pilot tenant; fallback local auth retained. | compliance risk |
| E09 | SCIM provisioning v0 | Enterprise scale | Alex (Eng Lead) | Identity | Upstream: E08 → Downstream: E25 | SCIM create/deactivate/role updates work for pilot tenant; provisioning audit events captured; rollback documented. | compliance risk |
| E10 | School directory request flow | Pilot hardening | Nina (PM) | Integrations/Directory | Upstream: E05, E06 → Downstream: E11, E12 | Find → request → approve/deny flow works end-to-end; admin approvals logged; parent notification sent. | integration risk |
| E11 | Directory approvals + partner submissions | Pilot hardening | Nina (PM) | Integrations/Directory | Upstream: E10 → Downstream: E23 | Approval actions log to audit trail; denial reason captured; request SLA metrics recorded. | compliance risk |
| E12 | Roster import (CSV/OneRoster-lite) | Pilot hardening | Diego (Eng Lead) | Integrations/Directory | Upstream: E06, E10 → Downstream: E13, E17, E18 | CSV import with validation; OneRoster-lite mapping supported; import summary + error report available. | integration risk |
| E13 | Deterministic identity mapping rules | Pilot hardening | Diego (Eng Lead) | Integrations/Directory | Upstream: E12 → Downstream: E17, E18 | Mapping rules documented and deterministic; no ghost students in test fixtures; conflicts surfaced in admin UI. | integration risk |
| E14 | Messaging delivery SLO + retry policy | MVP shipping | Kira (Eng Lead) | Messaging/Assignments/Scheduling | Upstream: E01, E05, E06 → Downstream: E15, E18 | Delivery SLO defined; retry + backoff implemented; delivery metrics recorded; dead-letter queue visible. | performance risk |
| E15 | Weekly digest reliability | Pilot hardening | Kira (Eng Lead) | Messaging/Assignments/Scheduling | Upstream: E02, E04, E14 → Downstream: E18 | Digest generation is scheduled and monitored; open/click tracking works; 95%+ success in staging run. | performance risk |
| E16 | Office hours booking flow | Pilot hardening | Omar (PM) | Messaging/Assignments/Scheduling | Upstream: E05, E06 → Downstream: E18 | Booking flow supports request → confirmation → reminder; double-booking prevented; cancellation policy documented. | integration risk |
| E17 | Assignments sync v0 (thin slice) | Pilot hardening | Leah (Eng Lead) | Messaging/Assignments/Scheduling | Upstream: E12, E13, E02 → Downstream: E18 | Assignments list visible; API contract stable; one source sync works or CSV stub with real data; analytics events recorded. | integration risk |
| E18 | Admin console: sync now + error visibility | MVP shipping | Raj (Eng Lead) | Analytics/Admin | Upstream: E04, E07, E12, E14, E15, E16, E17 → Downstream: E20, E23 | Admin can trigger sync, see last success, and view error summaries; troubleshooting steps linked; audit log entries created. | compliance risk |
| E19 | System health dashboard | MVP shipping | Raj (Eng Lead) | Analytics/Admin | Upstream: E01 → Downstream: E20 | Health dashboard shows service status, queue backlog, error rate; alerts route to Slack/webhook; tests validate health endpoints. | performance risk |
| E20 | Analytics dashboards (adoption + delivery + sync health) | Pilot hardening | Priya (PM) | Analytics/Admin | Upstream: E04, E18, E19 → Downstream: E22, E24 | Dashboards show activation, message delivery, sync success, and MTTR; data validated against events schema. | performance risk |
| E21 | Feature flags + rollback controls | MVP shipping | Maya (Eng Lead) | Analytics/Admin | Upstream: E01 → Downstream: E22, E25 | Feature flags exist for messaging, digest, assignments, integrations; rollback documented and tested. | compliance risk |
| E22 | Pilot ops runbooks + support playbook | Pilot hardening | Omar (PM) | Analytics/Admin | Upstream: E18, E20, E21 → Downstream: E24 | Runbooks for digest failing, sync failing, permission bug; support escalation path documented; playbook stored in admin console. | compliance risk |
| E23 | Command Center approvals + escalations | Pilot hardening | Raj (Eng Lead) | Growth layers | Upstream: E11, E18 → Downstream: E24 | Approvals for directory participation + roster acceptance; escalation routing (warn → Slack, error → webhook); admin actions logged. | compliance risk |
| E24 | Pilot success metrics + decision log | Pilot hardening | Serena (PM) | Growth layers | Upstream: E07, E20, E22, E23 → Downstream: E25 | 5–7 pilot metrics tracked; decision log operational with owner + rationale; weekly reporting cadence defined. | performance risk |
| E25 | Enterprise security/compliance hardening | Enterprise scale | Victor (Eng Lead) | Growth layers | Upstream: E08, E09, E21, E24 → Downstream: — | Security review complete; retention + DSAR flows verified; SSO/licensing docs in admin; compliance checklist signed. | compliance risk |

## B) Orthogonal Views (same epics, different filters)

### 1) Dependency Rail View (sequence)

**Foundation**
- E01 → E02 → E03 → E04 → E19 → E21

**Identity**
- E05 → E06 → E07 → E08 → E09

**Integrations/Directory**
- E10 → E11 → E12 → E13

**Messaging/Assignments/Scheduling**
- E14 → E15 → E16 → E17

**Analytics/Admin**
- E18 → E20 → E22

**Growth layers**
- E23 → E24 → E25

### 2) Pilot Readiness View (quality gates)

**Gate 0 — Foundation stable enough to build on**
- E01 Global error handling + structured logging
- E02 Performance baseline + cold start guardrails
- E03 Accessibility baseline (core screens)
- E04 Analytics event schema v0
- E19 System health dashboard

**Gate 1 — Identity & tenancy v0**
- E05 Core roles + RBAC enforcement
- E06 Tenant scoping hardening
- E07 Audit log for sensitive actions

**Gate 2 — Integrations/Directory v0**
- E10 School directory request flow
- E11 Directory approvals + partner submissions
- E12 Roster import (CSV/OneRoster-lite)
- E13 Deterministic identity mapping rules

**Gate 3 — Messaging + Assignments/Scheduling v1**
- E14 Messaging delivery SLO + retry policy
- E15 Weekly digest reliability
- E16 Office hours booking flow
- E17 Assignments sync v0 (thin slice)

**Gate 4 — Analytics + Admin Console v1**
- E18 Admin console: sync now + error visibility
- E20 Analytics dashboards (adoption + delivery + sync health)
- E22 Pilot ops runbooks + support playbook
- E23 Command Center approvals + escalations

## Gate Checklists (mini releases)

> These are tickets and must be checked off before downstream work is unblocked.

### Gate 0 checklist
- [ ] Global error handling + logging exists with request IDs (E01).
- [ ] Cold start + core screen perf budgets met (E02).
- [ ] Accessibility baseline pass for core screens (E03).
- [ ] Analytics event schema exists and is enforced (E04).
- [ ] System health dashboard shows error rate + queue backlog (E19).

### Gate 1 checklist
- [ ] Roles enforced in API + UI (E05).
- [ ] Tenant scoping enforced with automated tests (E06).
- [ ] Audit log captures sensitive actions + exports (E07).

### Gate 2 checklist
- [ ] Directory flow works end-to-end (E10).
- [ ] Approvals are logged + reasoned (E11).
- [ ] CSV/OneRoster-lite roster import works (E12).
- [ ] Identity mapping rules deterministic (E13).

### Gate 3 checklist
- [ ] Messaging delivery SLO + retries defined (E14).
- [ ] Weekly digest reliability measured (E15).
- [ ] Office hours booking flow works (E16).
- [ ] Assignments sync v0 works for one source (E17).

### Gate 4 checklist
- [ ] Dashboards show adoption + delivery + sync health (E20).
- [ ] Admin can sync now + view errors (E18).
- [ ] Runbooks + support playbook published (E22).
- [ ] Command Center approvals + escalations live (E23).

## Operating cadence (ruthless, tiny rituals)

- **Weekly (30 min): Dependency Rail Review**
  - Questions: (1) What’s blocked upstream? (2) What unblocks the most downstream value this week?
  - Output: 3–5 rail priorities for the week.

- **Twice weekly (15 min): Pilot Readiness Standup**
  - Review only pilot-critical flows: identity/permissions, message delivery, roster/import, digest reliability, admin troubleshooting gaps.

- **Biweekly: Release Readiness Check**
  - Checklist run: security basics, logging/metrics present, rollback plan exists, support playbook updated.

- **Always-on: Decision log**
  - Every decision captured with date, decision, rationale, and owner (E24).

## Thin vertical slices (execution rule)

**Example slice: Assignments Sync v0 (E17)**
- UI: show assignments list for a student.
- API: endpoint exists + contract stable.
- Integration: one source works (or CSV import with real data).
- Analytics: “assignment viewed” + “overdue count” tracked.
- Admin: “last sync time” visible.

## Ownership model (one accountable brain per rail segment)

- **Rail Lead: Foundation & Quality** — Maya (Eng Lead)
- **Rail Lead: Identity & Compliance** — Victor (Eng Lead)
- **Rail Lead: Integrations** — Diego (Eng Lead)
- **Rail Lead: Core Loops** — Kira (Eng Lead)
- **Rail Lead: Admin/Analytics** — Raj (Eng Lead)

## Orchestrator/Command Center as ops membrane

- **Approvals:** directory participation requests, roster import acceptance, partner submissions.
- **Runbooks:** digest failing, sync failing, permission bug.
- **Escalations:** warn → Slack, error → PagerDuty/webhook.
- **Rollbacks:** feature flags + disable connector + force resync actions.
- **Audit:** every admin action logged and visible.

## Pilot-first definition of success (metrics)

1. Parent activation rate (within 7 days)
2. Teacher response time / message reply rate
3. Weekly digest open rate + click-through
4. Sync success rate + MTTR for failures
5. Support load per school (tickets/week)
6. Permission errors (target near-zero)
7. Crash-free sessions / API error rate

## Start-Monday punch list

1. Create this board with 25 epics + tags + owners + dependencies (done here).
2. Track Gate 0–4 checklists as enforceable tickets (see Gate Checklists).
3. Pick the next gate to complete (default: Gate 0 or Gate 1).
4. Slice 2–3 vertical outcomes inside that gate.
5. Stand up the weekly Dependency Rail Review and keep it brutal.
