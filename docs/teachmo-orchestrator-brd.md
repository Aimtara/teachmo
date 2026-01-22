# Teachmo Orchestrator Business Requirements Document (BRD)

## Executive summary

Teachmo needs an orchestrator to reliably coordinate school-home communication, schedules, summaries/digests, safety reporting, AI coaching triggers, and multi-channel notifications—while meeting enterprise requirements (RBAC/ABAC, audit logs, observability, privacy, accessibility).

## Problem statement

- Parents face fragmented, inconsistent school communication and time constraints, increasing stress and missed actions.
- Schools and teachers cannot take on more operational burden.
- Enterprise deployments require strong controls and auditability.

## Business objectives

- **Reduce parent cognitive load:** fewer but higher-value touchpoints (digests/briefs) that increase follow-through.
- **Increase reliability + trust:** measurable uptime/latency, visible audits, and predictable notification behavior.
- **Protect data:** ironclad “parent-only-their-child” authorization, verified guardianship, and tenant isolation.
- **Enable pilots to scale:** integrations (SIS/LMS/SSO) without bespoke engineering burden.

## In-scope (Phase 1 orchestrator)

### Inputs

- School comms: inbound emails/messages/announcements (native + integrated)
- Scheduling/events: office hours slots, meetings, deadlines
- Engagement signals: opens, clicks, acknowledgements, “was this helpful”
- AI coaching triggers: “need help now,” homework assist, scenario selection
- System telemetry: auth failures, rate limit hits, duplicate storms, delivery failures

### Core capabilities

#### Policy & decision engine

- Rules + scoring: priority, suppression, dedupe, cooldowns, escalation thresholds
- Two-hemisphere arbitration: parent load budget vs teacher burden budget

#### Authorization & safety

- Multi-tenant isolation + RBAC/ABAC policies (deny by default)
- Guardian verification before child data access

#### Structured audit logs

- Auth failures (forbidden access, repeated attempts), decision traces, output deliveries, mitigations toggled
- Immutable storage and queryable by tenant/time/severity

#### Observability + health

- Health dashboard endpoint with rates (signals/day, actions/day, suppressed%, duplicates%)
- Rolling daily snapshots + hourly “today” snapshot for fast UI and near-real-time monitoring

#### Alerting & routing

- Hooks: Slack/email/webhook; routing by severity (warn → Slack, error → PagerDuty/webhook)
- Delivery tracking + retry + dead-letter behavior

#### Ops UI

- Per family: health, anomalies, alert deliveries, mitigation status
- Controls: “force clear mitigation,” “test alert endpoint”

### Outputs

- **Parent:** weekly digest, daily brief card, urgent alerts
- **Teacher/admin:** digest summaries, booking confirmations, escalation notifications
- **Support/ops:** anomaly alerts, dashboards, audit queries

## Out of scope (this BRD cut)

- Full district data lake, deep longitudinal academics, on-prem LLM hosting
- Advanced partner ecosystem automation beyond existing portal workflows

## Stakeholders & users

- **Parents/guardians:** clarity, fewer steps, privacy
- **Teachers:** time-bounded comms, office hours scheduling, minimal overhead
- **School/district admins:** compliance, audit, engagement analytics
- **Support/ops:** detect + resolve anomalies quickly (3am trust)
- **Partners (later):** submissions + approvals (separate but will feed orchestrator events)

## Key requirements (business + functional)

- **BR-1: Correctness of access**
  - A parent can only read data for children they are verified/linked to.
  - Any forbidden access attempt is logged as a structured audit event with anomaly counters.

- **BR-2: Notification sanity**
  - No duplicate storms: dedupe keys + cooldown windows.
  - Suppression is measurable (suppressed%, duplicates% available in health endpoint).

- **BR-3: Operability**
  - Expose health metrics and snapshots so dashboards are fast at scale.
  - Alert on anomaly thresholds and track delivery outcomes.

- **BR-4: UX alignment (reduce complexity)**
  - Orchestrator outputs land in simplified surfaces (role-based home, progressive disclosure).

- **BR-5: Integration readiness**
  - Support roster/identity sync (OneRoster/Clever/ClassLink/CSV fallback) as event sources for provisioning and policy scoping.

## Non-functional requirements

- **Security/compliance:** COPPA/FERPA-aligned consent + auditability, data minimization, retention defaults.
- **Accessibility:** orchestrator-driven UI states must be WCAG 2.1 AA compliant.
- **Performance:** health endpoints must be O(1) via snapshots; critical decisions must be low latency.
- **Reliability:** retry semantics, idempotency for actions, and dead-letter queues for failures.

## Success metrics

### Trust & reliability

- Auth failures logged 100% with structured fields.
- Alert delivery success rate ≥ 99% for configured endpoints.

### Noise reduction

- Duplicates suppressed ratio tracked; target “near zero parent-visible dupes.”

### Engagement

- Weekly active parents in pilots meets targets.
- Digest open rate, brief completion rate, action follow-through.

### Ops

- Mean time to detect anomalies (MTTD) and resolve (MTTR) improves quarter over quarter.

## Key risks & mitigations

- **Over-notifying (trust killer):** hard dedupe + cooldown + preference center defaults.
- **Under-notifying (safety killer):** severity routing + escalation + audit backstops.
- **Integration delays:** CSV fallback + staged SIS/LMS integration plan.
- **UX sprawl:** orchestrator outputs must map to a flattened IA (role-based homes, progressive disclosure).
