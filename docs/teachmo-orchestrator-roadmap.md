# Teachmo Orchestrator Strategic Roadmap

This roadmap assumes a school-first posture with a slim consumer funnel running alongside.

## Phase 0 — “Trustable Core” (0–8 weeks)

**Outcome:** The orchestrator becomes operable and safe enough to scale beyond a demo.

- **Multi-tenant safety + authorization**
  - Parent-only-their-child enforcement everywhere (API + UI gating)
  - ABAC policies for tenant/school/class scope

- **Structured audit logs**
  - Auth failures + sensitive actions + decision traces
  - Anomaly flags: repeated forbidden access, repeated duplicates

- **Health + snapshots**
  - Health endpoint: signals/day, actions/day, suppressed%, duplicates%
  - Daily rolling snapshots + hourly “today” snapshot (fast dashboards)

- **Alerting hooks + routing**
  - Warn → Slack; error → PagerDuty/webhook
  - Alert delivery tracking + retries

- **Ops UI v1**
  - Per family: health, anomalies, alert deliveries, mitigations
  - Buttons: “force clear mitigation,” “test alert endpoint”

## Phase 1 — “Value Loops” (8–16 weeks)

**Outcome:** Orchestrator stops being mostly plumbing and starts delivering compounding parent value.

- **Weekly Digest + Weekly Family Brief**
  - Digest of school messages + events
  - Brief personalization with load scoring + “words to try” tone constraints

- **Office Hours scheduling orchestration**
  - Confirmations, reminders, calendar sync, no double-booking

- **Preference center + channel policy**
  - Per-category mute, quiet hours, escalation exceptions (safety overrides)

- **UX simplification alignment**
  - Orchestrator outputs land in a flattened, role-aware IA

## Phase 2 — “Integration & Scale” (4–8 months)

**Outcome:** Teachmo becomes administratively lightweight for districts.

- **SIS/LMS/SSO integrations**
  - OneRoster/Clever/ClassLink + CSV fallback operationalized
  - Provisioning events feed orchestrator policies (who can see what, automatically)

- **School directory + request flows**
  - Orchestrated approvals, notifications, audit trail

- **Unified Explore deep-linking**
  - AI intent → Explore tab with prefilled filters (“For You / Activities / Events / Library”)

- **Admin analytics dashboards**
  - Engagement + comms throughput + response SLAs, powered by snapshots

## Phase 3 — “Governed Ecosystem” (8–14 months)

**Outcome:** Partners and programs scale without chaos.

- **Partner portal event flow integration**
  - Submission → approval → publish → analytics, with orchestrator-based notifications + audits

- **Programmatic campaigns**
  - District/school campaigns: family night, attendance pushes, tutoring drives
  - Orchestrator enforces frequency caps and equity-aware delivery (language + access)

## Phase 4 — “Adaptive Intelligence” (14+ months)

**Outcome:** The system learns without becoming spooky or unsafe.

- **Learning loops**
  - Success memory: what worked for a family, without overfitting or leaking context
  - Transparent “why this suggestion” and strict privacy boundaries

- **AI multi-provider resilience**
  - Model fallback + cost controls + per-response logging

- **Equity + inclusion hardening**
  - EN/ES baseline expansion and culturally inclusive defaults
