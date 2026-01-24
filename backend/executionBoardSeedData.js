/* eslint-env node */
// Seed data for the Single Execution Board (generated from Teachmo_Single_Execution_Board_v4.xlsx)

export const executionBoardSeed = {
  "epics": [
    {
      "id": "E01",
      "workstream": "Consumer Coach core (parent-facing)",
      "tag": "MVP shipping",
      "railSegment": "Core loops",
      "ownerRole": "Product+Eng (Parent app)",
      "upstream": "E09,E13",
      "downstream": "E05,E08,E22",
      "gates": "G0,G1,G3",
      "status": "Planned",
      "nextMilestone": "Ship daily tip + goal + activity loop with notifications",
      "dod": "Parent can onboard → set goals → receive daily guidance; core screens stable; basic telemetry",
      "notes": "Keep scope tight: 1–2 killer loops; avoid feature sprawl."
    },
    {
      "id": "E02",
      "workstream": "Messaging basics + weekly digest",
      "tag": "MVP shipping",
      "railSegment": "Core loops",
      "ownerRole": "Eng Lead (Messaging)",
      "upstream": "E09,E13,E03,E04",
      "downstream": "E10,E17,E18",
      "gates": "G1,G2,G3",
      "status": "Planned",
      "nextMilestone": "Reliable 1:1 messaging + weekly digest MVP",
      "dod": "Send/receive messages; digest generates on schedule; delivery retries; basic moderation",
      "notes": "Measure delivery + open rates from day 1."
    },
    {
      "id": "E03",
      "workstream": "School directory/autocomplete (find a school)",
      "tag": "MVP shipping",
      "railSegment": "Integrations",
      "ownerRole": "Eng Lead (Directory)",
      "upstream": "E09,E13",
      "downstream": "E02,E19,E20",
      "gates": "G1,G2",
      "status": "Planned",
      "nextMilestone": "End-to-end directory search + school request stub",
      "dod": "User can find school; request association; admin can view/act; audit trail exists",
      "notes": "Treat as identity bootstrap for pilots."
    },
    {
      "id": "E04",
      "workstream": "MVP integrations (CSV roster import / OneRoster-lite)",
      "tag": "MVP shipping",
      "railSegment": "Integrations",
      "ownerRole": "Eng Lead (Integrations)",
      "upstream": "E09,E13",
      "downstream": "E02,E15,E16,E11",
      "gates": "G2",
      "status": "Planned",
      "nextMilestone": "CSV roster import → deterministic mapping",
      "dod": "Import roster; validate; preview; commit; last sync timestamp stored; errors visible",
      "notes": "Start with CSV to de-risk vendor APIs."
    },
    {
      "id": "E05",
      "workstream": "Unified Explore hub + AI deep-link handoff",
      "tag": "Pilot hardening",
      "railSegment": "Core loops",
      "ownerRole": "PM+Eng (Experience)",
      "upstream": "E01,E06,E10",
      "downstream": "E22,E23",
      "gates": "G3",
      "status": "Backlog",
      "nextMilestone": "Unified Explore MVP (For You / Activities / Events / Library) + AI deep links",
      "dod": "Single Explore surface; filters; AI links to filtered results; session metrics captured",
      "notes": "Critical for 'AI → action' conversion."
    },
    {
      "id": "E06",
      "workstream": "UX navigation upgrades (hierarchical nav + command palette)",
      "tag": "Pilot hardening",
      "railSegment": "Foundation",
      "ownerRole": "Frontend Lead",
      "upstream": "E09,E13",
      "downstream": "E05,E07,E08",
      "gates": "G0",
      "status": "In progress",
      "nextMilestone": "Ship stable IA + keyboard/quick actions",
      "dod": "Nav is consistent; deep links reliable; permissions respected; no dead ends",
      "notes": "This reduces friction more than 'more features'."
    },
    {
      "id": "E07",
      "workstream": "Accessibility (WCAG 2.1 AA) + i18n baseline",
      "tag": "Pilot hardening",
      "railSegment": "Foundation",
      "ownerRole": "Design+Frontend",
      "upstream": "E09,E06",
      "downstream": "E08,E18",
      "gates": "G0",
      "status": "Planned",
      "nextMilestone": "Core screens pass AA checks + strings externalized",
      "dod": "Audit checklist pass on core flows; i18n framework wired; contrast/labels fixed",
      "notes": "Do it early or it becomes debt with interest."
    },
    {
      "id": "E08",
      "workstream": "Guided onboarding + tips + offline support",
      "tag": "Pilot hardening",
      "railSegment": "Core loops",
      "ownerRole": "PM+Frontend",
      "upstream": "E09,E10,E06",
      "downstream": "E01",
      "gates": "G0,G3",
      "status": "Backlog",
      "nextMilestone": "Onboarding that lands users in first success within 5 minutes",
      "dod": "Guided steps; empty states; offline caching for core content; drop-off tracked",
      "notes": "Pilot success often equals onboarding success."
    },
    {
      "id": "E09",
      "workstream": "App foundation refactors (TypeScript, state mgmt, errors, perf)",
      "tag": "Pilot hardening",
      "railSegment": "Foundation",
      "ownerRole": "Tech Lead",
      "upstream": null,
      "downstream": "E13,E10,E06",
      "gates": "G0",
      "status": "In progress",
      "nextMilestone": "Stabilize core app foundation",
      "dod": "Global error boundary; logging; perf budget; predictable state mgmt; basic test harness",
      "notes": "Unblocks everything; keep it boring and correct."
    },
    {
      "id": "E10",
      "workstream": "Analytics instrumentation + monitoring dashboards",
      "tag": "Pilot hardening",
      "railSegment": "Analytics/Admin",
      "ownerRole": "Data/Eng",
      "upstream": "E09,E13",
      "downstream": "E11,E12,E22",
      "gates": "G0,G4",
      "status": "Planned",
      "nextMilestone": "Event taxonomy + dashboards for adoption and reliability",
      "dod": "Core events emitted; dashboard shows activation, messaging delivery, digest success; alerts wired",
      "notes": "No analytics = flying blind."
    },
    {
      "id": "E11",
      "workstream": "Pilot admin console for integrations (setup, sync-now, error visibility)",
      "tag": "Pilot hardening",
      "railSegment": "Analytics/Admin",
      "ownerRole": "Eng Lead (Admin)",
      "upstream": "E10,E15,E13",
      "downstream": "E12,E20",
      "gates": "G2,G4",
      "status": "Backlog",
      "nextMilestone": "Admin can set up connectors and troubleshoot without engineers",
      "dod": "Sync-now; last sync; error list; runbook links; permissions enforced",
      "notes": "This is what makes pilots scalable."
    },
    {
      "id": "E12",
      "workstream": "Orchestrator / Command Center (approvals, runbooks, escalations, rollbacks)",
      "tag": "Pilot hardening",
      "railSegment": "Analytics/Admin",
      "ownerRole": "Platform Lead",
      "upstream": "E10,E13,E14,E11",
      "downstream": "E20,E24",
      "gates": "G4",
      "status": "In progress",
      "nextMilestone": "Command Center usable for ops workflows",
      "dod": "Actions are permissioned; audited; timeline for anomalies; rollback toggles; alert routing works",
      "notes": "Treat as 'ops membrane' during pilots."
    },
    {
      "id": "E13",
      "workstream": "Auth & Identity hardening (SSO, multi-tenant, RBAC/ABAC, guardianship)",
      "tag": "Enterprise scale",
      "railSegment": "Identity",
      "ownerRole": "Security/Platform",
      "upstream": "E09",
      "downstream": "E14,E15,E20",
      "gates": "G1",
      "status": "Planned",
      "nextMilestone": "Tenant boundaries + role enforcement + optional SSO",
      "dod": "RBAC/ABAC enforced end-to-end; tenant scoping verified; guardianship verified for child data",
      "notes": "This is your 'passport system'."
    },
    {
      "id": "E14",
      "workstream": "Safety, privacy, compliance (COPPA/FERPA, consent, retention, audit logs)",
      "tag": "Enterprise scale",
      "railSegment": "Identity",
      "ownerRole": "Security/Legal/Eng",
      "upstream": "E13,E09",
      "downstream": "E18,E24",
      "gates": "G1",
      "status": "Planned",
      "nextMilestone": "Consent + retention controls + immutable audit trails",
      "dod": "Consent captured; retention policy implemented; data export/deletion path; audit logs immutable",
      "notes": "Non-negotiable for school deployment."
    },
    {
      "id": "E15",
      "workstream": "Integrations expanded (SIS/LMS/SSO) + provisioning/role mgmt",
      "tag": "Enterprise scale",
      "railSegment": "Integrations",
      "ownerRole": "Eng Lead (Integrations)",
      "upstream": "E13,E04,E11",
      "downstream": "E16,E25",
      "gates": "G2",
      "status": "Backlog",
      "nextMilestone": "Add priority vendors / aggregators with robust sync jobs",
      "dod": "At least one SIS + one LMS connector stable; mapping rules; retries; rate limits; admin setup docs",
      "notes": "Sequence vendors by pilot demand."
    },
    {
      "id": "E16",
      "workstream": "Assignments sync (LMS)",
      "tag": "Enterprise scale",
      "railSegment": "Core loops",
      "ownerRole": "Eng Lead (LMS)",
      "upstream": "E15,E13,E10",
      "downstream": "E23",
      "gates": "G3",
      "status": "Backlog",
      "nextMilestone": "Assignments view + alerts for at-risk/overdue",
      "dod": "Assignments list accurate; due dates; notifications; parent acknowledges; sync health measurable",
      "notes": "Start with read-only, then add actions."
    },
    {
      "id": "E17",
      "workstream": "Office Hours scheduling",
      "tag": "Enterprise scale",
      "railSegment": "Core loops",
      "ownerRole": "Eng Lead (Scheduling)",
      "upstream": "E13,E02,E10",
      "downstream": "E18",
      "gates": "G3",
      "status": "Backlog",
      "nextMilestone": "Teacher slots → parent booking → reminders",
      "dod": "Publish slots; book; prevent double-book; reminders; calendar export; audit trail",
      "notes": "This is a high-trust workflow."
    },
    {
      "id": "E18",
      "workstream": "SafeSpace + emergency notifier + push notifications",
      "tag": "Enterprise scale",
      "railSegment": "Core loops",
      "ownerRole": "Platform+Safety",
      "upstream": "E14,E13,E02,E10",
      "downstream": "E24",
      "gates": "G3",
      "status": "Backlog",
      "nextMilestone": "Sensitive reporting + high-reliability notifications",
      "dod": "Role-gated reporting; escalation policy; delivery retries; audit log; abuse protections",
      "notes": "Requires governance + careful UX."
    },
    {
      "id": "E19",
      "workstream": "School directory participation flow + approvals",
      "tag": "Enterprise scale",
      "railSegment": "Integrations",
      "ownerRole": "Eng Lead (Directory/Admin)",
      "upstream": "E03,E13,E10",
      "downstream": "E20",
      "gates": "G2,G4",
      "status": "Backlog",
      "nextMilestone": "Request → verify → approve/deny with SLAs",
      "dod": "Approval queue; status updates; audit log; reporting on time-to-approval",
      "notes": "Turns directory into a growth funnel."
    },
    {
      "id": "E20",
      "workstream": "Licensing & subscription management (seats, billing)",
      "tag": "Enterprise scale",
      "railSegment": "Analytics/Admin",
      "ownerRole": "BizOps+Eng",
      "upstream": "E13,E19,E11",
      "downstream": "E21",
      "gates": "G4",
      "status": "Backlog",
      "nextMilestone": "Seat-based licensing + billing integration",
      "dod": "Org plan; seat allocations; invoices; role-based admin; reconciliation reports",
      "notes": "Do after identity is solid."
    },
    {
      "id": "E21",
      "workstream": "Partner portal (submissions → approval → analytics; training/incentives)",
      "tag": "Enterprise scale",
      "railSegment": "Growth",
      "ownerRole": "Partner Ops+Eng",
      "upstream": "E13,E10,E14,E20",
      "downstream": "E22,E23",
      "gates": "G4",
      "status": "Backlog",
      "nextMilestone": "Partner self-serve onboarding and publishing workflow",
      "dod": "Submit content; moderation queue; publish; analytics; partner roles/permissions",
      "notes": "Keep moderation tight."
    },
    {
      "id": "E22",
      "workstream": "Gamification enhancements",
      "tag": "R&D",
      "railSegment": "Growth",
      "ownerRole": "PM (Engagement)",
      "upstream": "E10,E01,E02",
      "downstream": null,
      "gates": null,
      "status": "Backlog",
      "nextMilestone": "Design experiments for retention loops",
      "dod": "Hypothesis defined; experiment plan; success metrics; rollback plan",
      "notes": "Run as experiments, not permanent features."
    },
    {
      "id": "E23",
      "workstream": "Content & curriculum alignment",
      "tag": "R&D",
      "railSegment": "Growth",
      "ownerRole": "PM (Curriculum)",
      "upstream": "E16,E10,E21",
      "downstream": null,
      "gates": null,
      "status": "Backlog",
      "nextMilestone": "Standards tagging + alignment-aware recommendations",
      "dod": "Metadata model; tagging workflow; recommendation logic; evaluation plan",
      "notes": "Needs teacher feedback loops."
    },
    {
      "id": "E24",
      "workstream": "Ethical AI governance + moderation (transparency, bias testing, oversight)",
      "tag": "R&D",
      "railSegment": "Identity",
      "ownerRole": "AI Safety Lead",
      "upstream": "E14,E10,E12",
      "downstream": null,
      "gates": null,
      "status": "Backlog",
      "nextMilestone": "Governance layer for AI behavior in sensitive contexts",
      "dod": "Model transparency UX; safety evaluations; escalation workflow; auditability",
      "notes": "Start minimal: logging + human override."
    },
    {
      "id": "E25",
      "workstream": "LTI 1.3 launch + inside-LMS access patterns",
      "tag": "R&D",
      "railSegment": "Integrations",
      "ownerRole": "Integrations Lead",
      "upstream": "E15,E13,E14",
      "downstream": null,
      "gates": null,
      "status": "Backlog",
      "nextMilestone": "Embed Teachmo inside LMS with secure launch",
      "dod": "LTI spec conformance; security review; pilot in 1 district",
      "notes": "Do when LMS integration is proven."
    }
  ],
  "gates": [
    {
      "gate": "G0",
      "purpose": "Foundation stable enough to build on",
      "checklist": "☐ Global error handling + logging\n☐ Perf budget defined + basic profiling\n☐ Core navigation stable\n☐ Accessibility baseline on core screens\n☐ Analytics schema exists (even minimal)",
      "ownerRole": "Tech Lead",
      "dependsOn": "—",
      "targetWindow": "Now + next 2–4 weeks",
      "status": "In progress"
    },
    {
      "gate": "G1",
      "purpose": "Identity & tenancy v0 (passport system)",
      "checklist": "☐ Roles enforced end-to-end\n☐ Tenant scoping verified\n☐ Audit log for sensitive actions\n☐ Consent baseline (where needed)\n☐ Permissions test cases exist",
      "ownerRole": "Security/Platform Lead",
      "dependsOn": "G0",
      "targetWindow": "Next 2–6 weeks",
      "status": "Planned"
    },
    {
      "gate": "G2",
      "purpose": "Integrations/Directory v0 (truth of who belongs where)",
      "checklist": "☐ School directory request flow works\n☐ Roster import (CSV) works with preview/commit\n☐ Deterministic identity mapping rules\n☐ Sync jobs have retries + last-sync timestamp\n☐ Admin can see errors",
      "ownerRole": "Integrations Lead",
      "dependsOn": "G1",
      "targetWindow": "Next 4–8 weeks",
      "status": "Planned"
    },
    {
      "gate": "G3",
      "purpose": "Core loops v1 (messaging + scheduling + assignments)",
      "checklist": "☐ Messaging delivery SLO defined and measured\n☐ Weekly digest reliable + measurable\n☐ Office hours booking MVP works\n☐ Assignments sync v0 live or contract-stubbed with real data",
      "ownerRole": "Core Loops Lead",
      "dependsOn": "G2",
      "targetWindow": "Next 6–12 weeks",
      "status": "Backlog"
    },
    {
      "gate": "G4",
      "purpose": "Analytics + Admin control room v1",
      "checklist": "☐ Dashboards show activation + delivery + sync health\n☐ Admin: sync now, last sync, error list\n☐ Runbooks linked and usable\n☐ Rollback/disable connector actions exist\n☐ On-call routing policy documented",
      "ownerRole": "Ops/Platform Lead",
      "dependsOn": "G3",
      "targetWindow": "Next 8–14 weeks",
      "status": "Backlog"
    }
  ],
  "slices": [
    {
      "id": "S01",
      "outcome": "Roster import v0: upload CSV → preview → commit → last-sync timestamp",
      "primaryEpic": "E04",
      "gate": "G2",
      "inputs": "Sample roster CSV; mapping rules; tenant/role check",
      "deliverables": "Import UI + API; validation errors; commit; store last_sync; error log",
      "acceptance": "Import sample dataset; verify counts; verify deterministic IDs; verify rollback of bad import",
      "status": "Planned",
      "owner": "Integrations Lead"
    },
    {
      "id": "S02",
      "outcome": "Messaging reliability v0: send/receive + retries + basic abuse guard",
      "primaryEpic": "E02",
      "gate": "G3",
      "inputs": "Identity mapping; notification service; rate limits",
      "deliverables": "Delivery queue; retry policy; failure dashboard",
      "acceptance": "Simulate outages; verify retry/backoff; verify metrics emitted; verify no duplicate storms",
      "status": "Backlog",
      "owner": "Messaging Lead"
    },
    {
      "id": "S03",
      "outcome": "Weekly digest v0: scheduled job → digest render → delivery → open tracking",
      "primaryEpic": "E02",
      "gate": "G3",
      "inputs": "Digest template; email/push delivery; analytics events",
      "deliverables": "Digest generation job; logs; delivery receipts; open/click events",
      "acceptance": "Generate for 10 test users; verify timing; verify opens recorded; verify opt-out works",
      "status": "Backlog",
      "owner": "Messaging Lead"
    },
    {
      "id": "S04",
      "outcome": "Permissions rail v0: role gates in UI + API for teacher/admin actions",
      "primaryEpic": "E13",
      "gate": "G1",
      "inputs": "Role matrix; tenant scoping rules",
      "deliverables": "RBAC middleware; UI guard components; audit events",
      "acceptance": "Try cross-tenant access; ensure denied; verify audit log entries",
      "status": "Planned",
      "owner": "Security/Platform Lead"
    },
    {
      "id": "S05",
      "outcome": "Admin sync console v0: last sync + sync now + error list for one connector",
      "primaryEpic": "E11",
      "gate": "G4",
      "inputs": "Connector job status; error model; identity roles",
      "deliverables": "Admin page; API endpoints; runbook links",
      "acceptance": "Trigger sync now; verify status updates; verify errors surface; verify permissions",
      "status": "Backlog",
      "owner": "Admin Lead"
    },
    {
      "id": "S06",
      "outcome": "Explore deep-link v0: AI links to filtered Explore results reliably",
      "primaryEpic": "E05",
      "gate": "G3",
      "inputs": "Stable routes; filter model",
      "deliverables": "Explore page; deep-link parser; analytics events",
      "acceptance": "Click AI deep link; verify filter applied; verify no 404; track conversion",
      "status": "Backlog",
      "owner": "Experience Lead"
    }
  ],
  "dependencies": [
    {
      "from": "E09",
      "to": "E01",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E13",
      "to": "E01",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E09",
      "to": "E02",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E13",
      "to": "E02",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E03",
      "to": "E02",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E04",
      "to": "E02",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E09",
      "to": "E03",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E13",
      "to": "E03",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E09",
      "to": "E04",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E13",
      "to": "E04",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E01",
      "to": "E05",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E06",
      "to": "E05",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E10",
      "to": "E05",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E09",
      "to": "E06",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E13",
      "to": "E06",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E09",
      "to": "E07",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E06",
      "to": "E07",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E09",
      "to": "E08",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E10",
      "to": "E08",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E06",
      "to": "E08",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E09",
      "to": "E10",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E13",
      "to": "E10",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E10",
      "to": "E11",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E15",
      "to": "E11",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E13",
      "to": "E11",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E10",
      "to": "E12",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E13",
      "to": "E12",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E14",
      "to": "E12",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E11",
      "to": "E12",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E09",
      "to": "E13",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E13",
      "to": "E14",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E09",
      "to": "E14",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E13",
      "to": "E15",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E04",
      "to": "E15",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E11",
      "to": "E15",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E15",
      "to": "E16",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E13",
      "to": "E16",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E10",
      "to": "E16",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E13",
      "to": "E17",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E02",
      "to": "E17",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E10",
      "to": "E17",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E14",
      "to": "E18",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E13",
      "to": "E18",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E02",
      "to": "E18",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E10",
      "to": "E18",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E03",
      "to": "E19",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E13",
      "to": "E19",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E10",
      "to": "E19",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E13",
      "to": "E20",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E19",
      "to": "E20",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E11",
      "to": "E20",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E13",
      "to": "E21",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E10",
      "to": "E21",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E14",
      "to": "E21",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E20",
      "to": "E21",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E10",
      "to": "E22",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E01",
      "to": "E22",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E02",
      "to": "E22",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E16",
      "to": "E23",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E10",
      "to": "E23",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E21",
      "to": "E23",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E14",
      "to": "E24",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E10",
      "to": "E24",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E12",
      "to": "E24",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E15",
      "to": "E25",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E13",
      "to": "E25",
      "type": "blocks",
      "notes": "Upstream required"
    },
    {
      "from": "E14",
      "to": "E25",
      "type": "blocks",
      "notes": "Upstream required"
    }
  ]
};
