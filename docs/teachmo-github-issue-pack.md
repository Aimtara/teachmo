# Teachmo GitHub Issue Pack

Use this file to create the parent tracking issue and the linked child issues for Teachmo’s completion matrix, gate closure, and governed AI runtime audit work.

---

# Parent Issue

## Title
`Teachmo Completion Matrix Tracking Issue`

## Body
## Goal
Use this issue as the working closure board for Teachmo’s SSOT epics and governed AI requirements.

### Status legend
- [ ] Not verified / not complete
- [x] Verified complete
- [-] Partial / scaffold exists, but not fully proven

---

## P0 — Immediate blockers

### E01 — Global error handling + structured logging
- [-] Middleware and metrics surfaces are mounted
- [ ] Centralized global error handler verified
- [ ] Structured log schema includes request ID, tenant, role, and surface
- [ ] Core flows have unhandled-exception coverage
- [ ] SSOT updated with verified status

### E03 — Accessibility baseline (core screens)
- [ ] WCAG AA checks pass for onboarding
- [ ] WCAG AA checks pass for dashboard
- [ ] WCAG AA checks pass for messaging
- [ ] Keyboard flows verified
- [ ] Accessibility signoff recorded

### E04 — Analytics event schema v0
- [-] Analytics and metrics routes exist
- [ ] Canonical analytics schema published
- [ ] Event schema enforced in code
- [ ] Onboarding events validated
- [ ] Messaging events validated
- [ ] Digest events validated

### E05 — Core roles + RBAC enforcement
- [-] Route-level role/scopes/actions are defined
- [ ] API-side authorization tests added
- [ ] Unauthorized attempts are blocked and logged
- [ ] UI role restrictions verified end-to-end

### E06 — Tenant scoping hardening
- [-] Tenant-aware routing and admin surfaces exist
- [ ] Cross-tenant API isolation tests added
- [ ] Cross-tenant DB/query isolation verified
- [ ] AI/admin flows validated for tenant isolation

### E07 — Audit log for sensitive actions
- [-] Audit export and audit log surfaces exist
- [ ] Sensitive actions coverage matrix completed
- [ ] Before/after state captured where required
- [ ] Search/filter/export flow works end-to-end
- [ ] Audit completeness reviewed

### E18 — Admin console: sync now + error visibility
- [-] Admin analytics/observability/integration health surfaces exist
- [ ] “Sync now” works for target integrations
- [ ] Error summaries are visible and actionable
- [ ] Recovery/troubleshooting flow validated with real failure scenarios
- [ ] Operational proof attached

### E19 — System health dashboard
- [-] System health page and `/api/metrics` exist
- [ ] Queue backlog visible
- [ ] Error rate visible
- [ ] Alerting behavior validated
- [ ] Health endpoints/tests match SSOT expectations

### E21 — Feature flags + rollback controls
- [-] Feature flag routes and admin page exist
- [ ] Messaging rollback drill completed
- [ ] AI governance rollback drill completed
- [ ] Integration rollback drill completed
- [ ] Rollback procedures documented

### AI-01 — Governance before generation
- [-] AI governance docs and admin surface exist
- [ ] All model invocation paths audited
- [ ] Every external model call is gated by policy evaluation
- [ ] No bypass path remains

### AI-02 — Zero-trust outbound sanitization
- [-] SSOT and contributor docs require sanitization
- [ ] Redaction boundary verified on every outbound AI adapter
- [ ] Regression tests added for redaction
- [ ] No raw sensitive payload crosses model boundary

### AI-03 — Structured governance telemetry
- [-] SSOT defines required telemetry fields
- [ ] `requestId` emitted everywhere required
- [ ] `policyOutcome` emitted everywhere required
- [ ] `matchedPolicies` emitted everywhere required
- [ ] `denialReason` emitted everywhere required
- [ ] `requiredSkill` emitted everywhere required
- [ ] `tenantScope` emitted everywhere required
- [ ] `verifier` emitted everywhere required

---

## P1 — Pilot readiness completion

### E10 — School directory request flow
- [-] School directory route exists
- [ ] Find → request → approve/deny works end-to-end
- [ ] Parent/admin notifications validated
- [ ] Approval path audited

### E11 — Directory approvals + partner submissions
- [-] Partner/admin/command-center surfaces exist
- [ ] Denial reasons captured
- [ ] SLA metrics recorded
- [ ] Approval workflow audited end-to-end

### E12 — Roster import (CSV/OneRoster-lite)
- [-] SIS roster and integration health pages exist
- [ ] Preview/commit flow works
- [ ] Validation summary available
- [ ] Error report available
- [ ] Pilot import rehearsal completed

### E13 — Deterministic identity mapping rules
- [ ] Mapping rules documented
- [ ] Conflict handling surfaced in admin UI
- [ ] Fixture tests prevent ghost students
- [ ] Deterministic mapping behavior verified

### E14 — Messaging delivery SLO + retry policy
- [-] Messaging/admin notifications/observability surfaces exist
- [ ] Delivery SLO documented
- [ ] Retry/backoff verified
- [ ] Dead-letter visibility available
- [ ] Failure metrics visible in admin

### E15 — Weekly digest reliability
- [-] Weekly briefs/admin surfaces exist
- [ ] Digest scheduling monitored
- [ ] Open/click tracking works
- [ ] Success-rate target met in staging
- [ ] Reliability evidence recorded

### E16 — Office hours booking flow
- [ ] Booking flow verified or implemented
- [ ] Request → confirmation works
- [ ] Reminder flow works
- [ ] Cancellation flow works
- [ ] Double-booking prevention verified

### E17 — Assignments sync v0
- [-] Assignments routes/pages exist
- [ ] One real source connected
- [ ] Stable API contract verified
- [ ] Last sync / sync health visible
- [ ] Analytics emitted for sync usage

### E20 — Analytics dashboards
- [-] Admin analytics page exists
- [ ] Adoption metrics validated
- [ ] Delivery metrics validated
- [ ] Sync health metrics validated
- [ ] Data quality checks documented

### E22 — Pilot ops runbooks + support playbook
- [ ] Digest failure runbook published
- [ ] Sync failure runbook published
- [ ] Permission bug runbook published
- [ ] Escalation path documented
- [ ] Runbooks linked in admin surfaces

### E23 — Command Center approvals + escalations
- [-] Command center surfaces exist
- [ ] Approval actions validated
- [ ] Escalation routing validated
- [ ] Slack/webhook/PagerDuty behavior proven
- [ ] Audit trail confirmed

### E24 — Pilot success metrics + decision log
- [-] Metrics are defined in SSOT
- [ ] 5–7 pilot metrics tracked live
- [ ] Weekly reporting cadence established
- [ ] Decision log exists
- [ ] Decision log has owner + rationale + date

### AI-04 — Maker/checker for high-stakes AI
- [-] SSOT requires verifier behavior
- [ ] High-stakes flows inventory completed
- [ ] Shadow mode enabled where needed
- [ ] Verifier metrics reviewed
- [ ] False-positive loop established

### AI-05 — Tenant-scoped progressive rollout
- [-] Feature flag/admin surfaces and rollout model exist
- [ ] Rollout ladder documented
- [ ] One pilot tenant tested
- [ ] Staged enablement proven
- [ ] Rollback plan attached

### AI-06 — Admin visibility for governed AI
- [-] Admin AI governance/prompt/review surfaces exist
- [ ] Live runtime data visible in dashboards
- [ ] Reviewer workflows validated
- [ ] Admin UX audit completed

---

## P2 — Enterprise hardening

### E08 — SSO (SAML/OIDC) v0
- [-] SSO route and admin surfaces exist
- [ ] One provider validated end-to-end
- [ ] Pilot tenant rollout completed
- [ ] Fallback local auth confirmed

### E09 — SCIM provisioning v0
- [-] SCIM route exists
- [ ] Create lifecycle verified
- [ ] Deactivate lifecycle verified
- [ ] Role update lifecycle verified
- [ ] Provisioning audit trail confirmed

### E25 — Enterprise security/compliance hardening
- [-] Compliance, SSO, SCIM, audit export surfaces exist
- [ ] Retention flow validated
- [ ] DSAR flow validated
- [ ] Compliance checklist completed
- [ ] Enterprise evidence pack assembled

---

## Closure metadata

### Owners
- Foundation & Quality — Maya
- Identity & Compliance — Victor
- Integrations — Diego
- Core Loops — Kira
- Admin/Analytics — Raj

### Review cadence
- [ ] Weekly Dependency Rail Review active
- [ ] Twice-weekly Pilot Readiness Standup active
- [ ] Biweekly Release Readiness Check active
- [ ] Decision log maintained continuously

### Final readiness checks
- [ ] Gate 0 closed
- [ ] Gate 1 closed
- [ ] Gate 2 closed
- [ ] Gate 3 closed
- [ ] Gate 4 closed
- [ ] AI governance SSOT requirements verified in runtime
- [ ] SSOT updated to reflect actual completion state

---

# Child Issue 1

## Title
`Gate 0 closure: foundation quality, observability, accessibility, and analytics`

## Body
## Parent issue
Link to: `Teachmo Completion Matrix Tracking Issue`

## Labels
- `epic`
- `gate-0`
- `foundation`
- `quality`
- `observability`

## Priority
`P0`

## Owner
- Maya (Eng Lead)
- Luis (Eng Lead)
- Priya (PM)
- Jonah (Eng Lead)
- Raj (Eng Lead)

## Summary
Close Gate 0 by proving the platform is stable enough to build on.

## Covers
- E01 Global error handling + structured logging
- E02 Performance baseline + cold start guardrails
- E03 Accessibility baseline
- E04 Analytics event schema v0
- E19 System health dashboard

## Acceptance criteria

### E01 — Global error handling + structured logging
- [ ] Centralized backend error handler verified
- [ ] Structured logs include request ID, tenant, role, and surface
- [ ] Core flows have unhandled-exception coverage

### E02 — Performance baseline + cold start guardrails
- [ ] Core screen performance budgets defined
- [ ] CI perf regression checks wired
- [ ] Cold-start thresholds measured and documented

### E03 — Accessibility baseline
- [ ] WCAG AA checks pass for onboarding
- [ ] WCAG AA checks pass for dashboard
- [ ] WCAG AA checks pass for messaging
- [ ] Keyboard-only flows verified

### E04 — Analytics event schema v0
- [ ] Canonical analytics event schema published
- [ ] Schema enforced in code
- [ ] Onboarding, messaging, and digest coverage verified

### E19 — System health dashboard
- [ ] Health dashboard shows queue backlog
- [ ] Health dashboard shows error rate
- [ ] Alerts/health checks validated

## Evidence
- `backend/app.js` mounts metrics and observability surfaces
- `backend/index.js` already has structured startup/runtime controls
- Execution board still treats these as Gate 0 requirements

---

# Child Issue 2

## Title
`Gate 1 closure: RBAC, tenant isolation, and audit completeness`

## Body
## Parent issue
Link to: `Teachmo Completion Matrix Tracking Issue`

## Labels
- `epic`
- `gate-1`
- `identity`
- `compliance`
- `security`

## Priority
`P0`

## Owner
- Serena (PM)
- Victor (Eng Lead)

## Summary
Close Gate 1 by proving identity, role enforcement, tenant boundaries, and auditability are production-safe.

## Covers
- E05 Core roles + RBAC enforcement
- E06 Tenant scoping hardening
- E07 Audit log for sensitive actions

## Acceptance criteria

### E05 — Core roles + RBAC enforcement
- [ ] API-side authorization tests added
- [ ] Unauthorized attempts blocked and logged
- [ ] UI role restrictions verified end-to-end

### E06 — Tenant scoping hardening
- [ ] Cross-tenant API isolation tests added
- [ ] Cross-tenant DB/query isolation verified
- [ ] AI/admin flows validated for tenant isolation

### E07 — Audit log for sensitive actions
- [ ] Sensitive actions coverage matrix completed
- [ ] Before/after state captured where required
- [ ] Search/filter/export flow works end-to-end

## Evidence
- Role/scopes/actions are already represented in route config
- Audit export and audit/admin surfaces are mounted
- SSOT still lists Gate 1 as required for pilot readiness

---

# Child Issue 3

## Title
`Gate 2 closure: directory flows, approvals, roster import, identity mapping`

## Body
## Parent issue
Link to: `Teachmo Completion Matrix Tracking Issue`

## Labels
- `epic`
- `gate-2`
- `directory`
- `integrations`
- `pilot`

## Priority
`P1`

## Owner
- Nina (PM)
- Diego (Eng Lead)

## Summary
Close Gate 2 by validating end-to-end directory and roster workflows.

## Covers
- E10 School directory request flow
- E11 Directory approvals + partner submissions
- E12 Roster import (CSV/OneRoster-lite)
- E13 Deterministic identity mapping rules

## Acceptance criteria

### E10 — School directory request flow
- [ ] Find → request → approve/deny works end-to-end
- [ ] Parent/admin notifications validated
- [ ] Approval path audited

### E11 — Directory approvals + partner submissions
- [ ] Denial reasons captured
- [ ] SLA metrics recorded
- [ ] Approval workflow audited end-to-end

### E12 — Roster import (CSV/OneRoster-lite)
- [ ] Preview/commit flow works
- [ ] Validation summary available
- [ ] Error report available
- [ ] Pilot import rehearsal completed

### E13 — Deterministic identity mapping rules
- [ ] Mapping rules documented
- [ ] Conflict handling surfaced in admin UI
- [ ] Fixture tests prevent ghost students

## Evidence
- School directory, SIS roster, integration health, and partner/admin surfaces exist in app routes
- Execution board still treats these as incomplete Gate 2 deliverables

---

# Child Issue 4

## Title
`Gate 3 closure: messaging reliability, digests, office hours, assignments sync`

## Body
## Parent issue
Link to: `Teachmo Completion Matrix Tracking Issue`

## Labels
- `epic`
- `gate-3`
- `messaging`
- `assignments`
- `pilot`

## Priority
`P1`

## Owner
- Kira (Eng Lead)
- Omar (PM)
- Leah (Eng Lead)

## Summary
Close Gate 3 by proving the parent/teacher core loops work reliably.

## Covers
- E14 Messaging delivery SLO + retry policy
- E15 Weekly digest reliability
- E16 Office hours booking flow
- E17 Assignments sync v0

## Acceptance criteria

### E14 — Messaging delivery SLO + retry policy
- [ ] Delivery SLO documented
- [ ] Retry/backoff verified
- [ ] Dead-letter visibility available
- [ ] Failure metrics visible in admin

### E15 — Weekly digest reliability
- [ ] Digest scheduling monitored
- [ ] Open/click tracking works
- [ ] Success-rate target met in staging

### E16 — Office hours booking flow
- [ ] Booking flow verified or implemented
- [ ] Request → confirmation works
- [ ] Reminder flow works
- [ ] Cancellation flow works
- [ ] Double-booking prevention verified

### E17 — Assignments sync v0
- [ ] One real source connected
- [ ] Stable API contract verified
- [ ] Last sync / sync health visible
- [ ] Analytics emitted for sync usage

## Evidence
- Messaging, weekly briefs, teacher assignments, backend assignments surfaces exist
- Execution board still treats these as Gate 3 work

---

# Child Issue 5

## Title
`Gate 4 closure: admin control room, analytics validation, runbooks, and escalations`

## Body
## Parent issue
Link to: `Teachmo Completion Matrix Tracking Issue`

## Labels
- `epic`
- `gate-4`
- `admin`
- `analytics`
- `operations`

## Priority
`P1`

## Owner
- Raj (Eng Lead)
- Priya (PM)
- Omar (PM)
- Serena (PM)

## Summary
Close Gate 4 by making the admin/control-plane surfaces operationally complete.

## Covers
- E18 Admin console: sync now + error visibility
- E20 Analytics dashboards
- E22 Pilot ops runbooks + support playbook
- E23 Command Center approvals + escalations
- E24 Pilot success metrics + decision log

## Acceptance criteria

### E18 — Admin console: sync now + error visibility
- [ ] “Sync now” works for target integrations
- [ ] Error summaries are visible and actionable
- [ ] Recovery/troubleshooting flow validated

### E20 — Analytics dashboards
- [ ] Adoption metrics validated
- [ ] Delivery metrics validated
- [ ] Sync health metrics validated
- [ ] Data quality checks documented

### E22 — Pilot ops runbooks + support playbook
- [ ] Digest failure runbook published
- [ ] Sync failure runbook published
- [ ] Permission bug runbook published
- [ ] Runbooks linked in admin surfaces

### E23 — Command Center approvals + escalations
- [ ] Approval actions validated
- [ ] Escalation routing validated
- [ ] Audit trail confirmed

### E24 — Pilot success metrics + decision log
- [ ] 5–7 pilot metrics tracked live
- [ ] Weekly reporting cadence established
- [ ] Decision log exists with owner + rationale + date

## Evidence
- Admin analytics, observability, command center, execution board, system health, notifications, workflows all exist in route config and backend mount points
- Execution board still treats these as closure work, not proven complete

---

# Child Issue 6

## Title
`Enterprise hardening: SSO, SCIM, compliance evidence, retention, DSAR`

## Body
## Parent issue
Link to: `Teachmo Completion Matrix Tracking Issue`

## Labels
- `epic`
- `enterprise`
- `identity`
- `compliance`
- `security`

## Priority
`P2`

## Owner
- Alex (Eng Lead)
- Victor (Eng Lead)

## Summary
Finish the enterprise-scale identity and compliance work required for district and institutional readiness.

## Covers
- E08 SSO v0
- E09 SCIM provisioning v0
- E25 Enterprise security/compliance hardening

## Acceptance criteria

### E08 — SSO (SAML/OIDC) v0
- [ ] One provider validated end-to-end
- [ ] Pilot tenant rollout completed
- [ ] Fallback local auth confirmed

### E09 — SCIM provisioning v0
- [ ] Create lifecycle verified
- [ ] Deactivate lifecycle verified
- [ ] Role update lifecycle verified
- [ ] Provisioning audit trail confirmed

### E25 — Enterprise security/compliance hardening
- [ ] Retention flow validated
- [ ] DSAR flow validated
- [ ] Compliance checklist completed
- [ ] Enterprise evidence pack assembled

## Evidence
- SSO, SCIM, compliance, audit-export surfaces already exist in backend/routes and admin routes
- Execution board still places these in enterprise-scale hardening

---

# Child Issue 7

## Title
`Governed AI runtime enforcement audit`

## Body
## Parent issue
Link to: `Teachmo Completion Matrix Tracking Issue`

## Labels
- `epic`
- `ai`
- `governance`
- `compliance`
- `platform`

## Priority
`P0`

## Owner
- Maya (Eng Lead)
- Victor (Eng Lead)
- Raj (Eng Lead)

## Summary
Verify the runtime matches the AI SSOT: policy-before-generation, redaction, telemetry, verifier behavior, progressive rollout, and admin visibility.

## Covers
- AI-01 Governance before generation
- AI-02 Zero-trust outbound sanitization
- AI-03 Structured governance telemetry
- AI-04 Maker/checker for high-stakes AI
- AI-05 Tenant-scoped progressive rollout
- AI-06 Admin visibility for governed AI

## Acceptance criteria

### AI-01 — Governance before generation
- [ ] All model invocation paths audited
- [ ] Every external model call is gated by policy evaluation
- [ ] No bypass path remains

### AI-02 — Zero-trust outbound sanitization
- [ ] Redaction boundary verified on every outbound AI adapter
- [ ] Regression tests added
- [ ] No raw sensitive payload crosses model boundary

### AI-03 — Structured governance telemetry
- [ ] `requestId` emitted everywhere required
- [ ] `policyOutcome` emitted everywhere required
- [ ] `matchedPolicies` emitted everywhere required
- [ ] `denialReason` emitted everywhere required
- [ ] `requiredSkill` emitted everywhere required
- [ ] `tenantScope` emitted everywhere required
- [ ] `verifier` emitted everywhere required

### AI-04 — Maker/checker for high-stakes AI
- [ ] High-stakes flows inventory completed
- [ ] Shadow mode enabled where needed
- [ ] Verifier metrics reviewed
- [ ] False-positive loop established

### AI-05 — Tenant-scoped progressive rollout
- [ ] Rollout ladder documented
- [ ] One pilot tenant tested
- [ ] Staged enablement proven
- [ ] Rollback plan attached

### AI-06 — Admin visibility for governed AI
- [ ] Live runtime data visible in dashboards
- [ ] Reviewer workflows validated
- [ ] Admin UX audit completed

## Evidence
- AI governance SSOT is explicit about required patterns and definition of done
- Admin AI governance/review/prompt surfaces exist in route config
- Contributor guidance already encodes governance requirements

---

# Child Issue 8

## Title
`SSOT reconciliation: align roadmap, gates, and code reality`

## Body
## Parent issue
Link to: `Teachmo Completion Matrix Tracking Issue`

## Labels
- `epic`
- `ssot`
- `planning`
- `operations`

## Priority
`P0`

## Owner
- Serena (PM)
- Maya (Eng Lead)

## Summary
The codebase now contains many route/page/control-plane surfaces that the execution board still treats as planned or incomplete. Reconcile the SSOT to reflect reality.

## Acceptance criteria
- [ ] Every epic is marked as shipped / partial / not started
- [ ] Each epic links to concrete code evidence
- [ ] Each epic links to missing tests/proof
- [ ] Gate 0–4 checklist states reflect reality
- [ ] Parent tracking issue updated
- [ ] Execution board updated to remove phantom completeness / phantom backlog

## Evidence
- Execution board still lists Gate 0–4 as checklists to close
- Codebase already exposes many admin/enterprise/control-plane surfaces across backend and frontend routes

---

# Recommended creation order

1. `SSOT reconciliation: align roadmap, gates, and code reality`
2. `Gate 0 closure: foundation quality, observability, accessibility, and analytics`
3. `Gate 1 closure: RBAC, tenant isolation, and audit completeness`
4. `Governed AI runtime enforcement audit`
5. `Gate 2 closure: directory flows, approvals, roster import, identity mapping`
6. `Gate 3 closure: messaging reliability, digests, office hours, assignments sync`
7. `Gate 4 closure: admin control room, analytics validation, runbooks, and escalations`
8. `Enterprise hardening: SSO, SCIM, compliance evidence, retention, DSAR`
