# Enterprise UI Redesign Burndown and Codebase Audit

Audit date: **2026-05-07**

This tracker converts the comprehensive enterprise-grade UI redesign plan into phase-level burndown items and records the current codebase implementation status. Status values are intentionally evidence-based:

- `Done`: acceptance criteria are implemented and backed by automated or measured evidence.
- `Partial`: visible UI, route, component, or documentation evidence exists, but at least one production requirement, integration, measurement, or acceptance criterion remains open.
- `Not started`: no meaningful implementation evidence was found in this audit.

## Audit method

The audit reviewed the route map, reusable enterprise components, major page surfaces, Storybook/test coverage, production scripts, and readiness documentation. Key commands used:

```bash
rg --files -g 'AGENTS.md' -g '!node_modules' -g '!dist' -g '!build'
find docs -maxdepth 2 -type f | sort
sed -n '1,240p' src/config/routes.jsx
find src/components -maxdepth 2 -type f | sort
rg -n "EnterpriseSurface|EnterpriseShell|high-contrast|theme|autosave|personal|filter|leader|drag|attachment|voice|explain|privacy|three|Weekly|triage|heatmap|CMS|compliance|runbook|policy|dead-letter|retry|batch|fine|export|Founder|audit" src tests docs package.json --glob '!node_modules'
```

## Executive rollup

| Status | Phases | Count | Current readout |
| --- | --- | ---: | --- |
| Done | None | 0 | No phase fully satisfies all acceptance criteria because the plan includes production metrics, user research, external integrations, or rollout evidence that is not present in-repo. |
| Partial | 1-17 | 17 | All phases have at least documentation, route, component, shell, test, or compliance evidence. The strongest implementation is the enterprise surface system, settings theme switching, parent Today, teacher triage, partner portal tabs, data health retry UI, and admin governance shells. |
| Not started | None | 0 | No phase is completely absent; however, several tasks inside phases remain unstarted, especially user research, analytics outcome measurement, visual regression, third-party provider proof, and training assets. |

## Burndown scoring

The redesign plan is tracked as **170 total phase points**: 10 points per phase. Credit is based on repository evidence only, not implied roadmap intent. The current codebase earns **79 / 170 points (46%)**, leaving **91 points (54%)**.

| Phase | Plan area | Status | Points credited | Remaining points | Audit evidence | Primary remaining burn |
| --- | --- | --- | ---: | ---: | --- | --- |
| 1 | Discovery & Design Strategy | Partial | 4 | 6 | Existing docs cover enterprise UI direction and this audit now catalogs page/component evidence. Radix dependencies are already present in `package.json`, suggesting a component-library direction. | Complete role research interviews, prioritize pain points, document stakeholder signoff, and publish explicit product-shell decisions. |
| 2 | Enterprise Design System & Component Library | Partial | 7 | 3 | `src/components/enterprise/*` includes surface, shell, stat card, badge, data table, preferences, command palette, Storybook stories, and CSS theme variables including high contrast. | Enforce tokens across every page, add component stories for all composite workflows, and capture WCAG/motion specs for each primitive. |
| 3 | Onboarding Experiences | Partial | 5 | 5 | `/onboarding`, `/onboarding/parent`, and `/onboarding/teacher` routes exist; the onboarding page describes progressive, autosaved, AI-guided role paths. | Finish role-specific parent/teacher/partner/admin step sets, localization, analytics, resume proof, and completion-rate measurement. |
| 4 | Discover & Content Exploration | Partial | 5 | 5 | `/discover` routes to `UnifiedDiscover`; UI advertises filters, saved filters, infinite-scroll readiness, age-aware ranking, and community results. | Implement production personalization/ranking, saved searches, infinite scroll data loading, algorithm docs, and 10+ user tests per role. |
| 5 | Community & Social Features | Partial | 5 | 5 | `/community` resolves through `Community.jsx` to `UnifiedCommunity`; community components include feeds, pods, post forms, leaderboards, privacy settings, and reporting modals. | Wire full create/edit/delete, rich post content, report/block propagation to admin queues, pagination SLA proof, and privacy policy docs. |
| 6 | Calendar & Scheduling Tools | Partial | 5 | 5 | `/calendar` uses `EnterpriseSurface`, multiple view toggles, drag/drop handlers, existing booking/agenda/office-hours components, and local retry status. | Add durable update/delete persistence, event wizard, Google/Outlook sync verification, reminders, virtualization, and measured smoothness. |
| 7 | Messaging & Communication | Partial | 5 | 5 | `/messages`, `/messages/requests`, and `/teacher-messages` routes exist; the main inbox includes conversation search, approvals, attachments, voice-note copy, and optimistic send states. | Fully merge route behavior, add realtime delivery proof, attachments/voice persistence, notification preference linkage, and one-click approval backend evidence. |
| 8 | AI Hub & Explainability | Partial | 4 | 6 | `/ai-assistant` and `/ai/explainability/:id` routes exist; the assistant page presents chat, quick actions, voice entry, explainability, and privacy posture together. | Actually merge explainability detail route into one hub, add history view/delete, opt-out controls, voice commands, response latency evidence, and accessible diagrams. |
| 9 | Settings & User Preferences | Partial | 7 | 3 | Settings is tabbed by profile/security/notifications/personalization/privacy and applies light/dark/high-contrast classes immediately via local storage. | Persist all settings through user-preferences APIs, prove keyboard-only operation, and ensure all app surfaces update instantly. |
| 10 | Role-Specific Dashboards & Today View | Partial | 7 | 3 | Parent dashboard enforces the calm Today pattern with a persistent Weekly Family Brief and three prioritized cards; teacher dashboard includes smart queues and a class health heatmap. | Complete partner/admin parity, wire teacher queues to live data/actions, unify Explore tab fully, and add adoption/efficiency analytics. |
| 11 | Partner Portal Enhancements | Partial | 6 | 4 | Partner portal exposes CMS workspace tabs, submissions, analytics, billing/incentives/training routes, public registration, and compliance tracker UI. | Add durable asset/PDF uploads, approval history, analytics export, API docs, compliance document storage, and distinct public-vs-internal visual proof. |
| 12 | District & Admin Surfaces | Partial | 6 | 4 | Admin command center, district overview, AI governance, integration health, observability, analytics, workflows, tenant, SSO, users, audit logs, compliance, and feature flag routes exist. | Finish modular dashboard parity, RBAC verification, policy simulation persistence/export, runbook alert timing proof, and self-service configuration completion. |
| 13 | Integration, Moderation & Governance Enhancements | Partial | 5 | 5 | Integration health shows severity, reconciliation, dead-letter rows, and retry actions; moderation queue includes report triage actions; AI fine-tuning has a lifecycle/wizard shell. | Add alert SLA telemetry, batch moderation, AI explanations, privacy scans, dataset upload, job monitoring, rollback, and two-click resolution proof. |
| 14 | Transparency & Directories | Partial | 5 | 5 | AI transparency uses an enterprise shell with governance flow and policy documents; school directory has search/filter UI, privacy scope, messaging access requests, and data-export readiness copy. | Add interactive infographics, sub-second search proof, advanced contact cards, privacy controls, and real CSV/Excel export validation. |
| 15 | Founder & Internal Tools | Partial | 5 | 5 | Founder dashboard exists with secure command-center framing, launch gates, experiment registry, compliance posture, and internal diagnostics. | Add production KPI accuracy, timeframe/region filters, strict permission tests, internal action audit logging, and hidden/system tool inventory. |
| 16 | Testing, Performance & Compliance | Partial | 4 | 6 | Package scripts cover lint, Vitest, Jest, Playwright, a11y, build, size, production checks, secret hygiene, RBAC/auth safety, Hasura readiness, PII logging, and compliance foundations. | Expand route-specific a11y, visual regression, Lighthouse budgets, motion performance checks, CI evidence, and usability analytics. |
| 17 | Documentation & Rollout | Partial | 4 | 6 | Docs include design system, accessibility, security, AI transparency, compliance, rollout/readiness materials, and this burndown. | Create user guides, videos/in-app tours, staging pilot report, training material, support FAQs, and production rollout feedback loop. |

## Workstream-level burndown

| ID | Workstream | Status | Current evidence | Remaining completion criteria |
| --- | --- | --- | --- | --- |
| UI-001 | Enterprise design tokens, themes, surface primitives, motion/focus rules | Partial | Enterprise primitives, CSS variables, high-contrast class, Storybook stories. | Enforce tokens across all legacy pages and document complete WCAG 2.2 AA + motion contract. |
| UI-002 | Storybook component documentation | Partial | Stories exist for enterprise surface/stat/data table and some analytics/calendar components. | Add stories for onboarding, partner CMS, calendar wizard, messaging, trust console, data hub, moderation, and directory patterns. |
| UI-003 | Role-aware onboarding with autosave and AI guidance | Partial | Onboarding route and role cards exist with autosave/AI-guidance copy. | Implement complete role-specific persisted wizards, localization, resume tests, and analytics. |
| UI-004 | Discover personalization, filters, saved search, community blending | Partial | Unified Discover shell and filter bar exist. | Implement production ranking, saved search persistence, infinite scroll, community privacy labels, and algorithm docs. |
| UI-005 | Community feed, pods, leaderboards, post creation, reporting | Partial | Community route and component inventory exist. | Complete rich post CRUD, moderation propagation, block/report state, and feed performance proof. |
| UI-006 | Calendar scheduling with multiple views and agenda | Partial | Calendar route has redesigned surface, view toggles, drag/drop scheduling, and local retry state. | Add durable rescheduling, external provider sync, reminders, virtualization, and wizard completion. |
| UI-007 | Messaging rich chat and approvals | Partial | Unified inbox UI has approvals, thread list, filters, and composer affordances. | Finish realtime, attachments/voice persistence, notification preferences, and merged teacher/request routes. |
| UI-008 | Unified AI hub and explainability | Partial | Assistant shell references chat, quick actions, voice, explainability, and privacy. | Merge detail pages, implement history controls, opt-out, voice input, accessible diagrams, and latency proof. |
| UI-009 | Settings tabs, instant themes, privacy controls | Partial | Settings tabs and instant light/dark/high-contrast class toggles exist. | Persist preferences via APIs and verify keyboard-only updates across the full app. |
| UI-010 | Parent Today and teacher triage | Partial | Parent Today/Weekly Brief and teacher smart queues/heatmap exist. | Wire live queues/actions, analytics, and adoption/efficiency measurement. |
| UI-011 | Partner CMS workspace | Partial | Partner portal tabs and compliance tracker UI exist. | Add file uploads, approvals, analytics exports, submission APIs, and compliance storage. |
| UI-012 | Admin command center, trust console, and data health hub | Partial | Admin, governance, integration health, audit, observability, tenant, SSO, and compliance pages exist. | Complete persistence, exports, RBAC proofs, incident SLA telemetry, and self-service setup flows. |
| UI-013 | Moderation and AI fine-tuning | Partial | Moderation triage and AI fine-tuning lifecycle shells exist. | Add batch workflows, AI moderation explanations, dataset upload/privacy scan/training monitor/rollback. |
| UI-014 | Transparency, directory, and export tools | Partial | AI transparency and school directory redesign shells exist. | Finish interactive visuals, advanced search/contact cards, privacy controls, and verified exports. |
| UI-015 | Founder/internal tools | Partial | Founder command panel exists. | Add charted KPIs, filters, strict role permissions, audit logging, and internal-tool hardening. |
| UI-016 | Automated testing, a11y, performance, security, compliance | Partial | Scripts and some enterprise E2E/a11y coverage exist. | Expand visual regression, Lighthouse, motion budgets, role workflow coverage, and CI passing evidence. |
| UI-017 | Documentation, rollout, training | Partial | Readiness/compliance/design docs exist. | Add guides, tours, training, pilot feedback, support docs, and rollout checklist evidence. |

## Highest-priority burn order

1. **Persist what is currently demo/local state**: messaging approvals, calendar reschedules, partner assets/compliance uploads, integration dead-letter retries, policy simulation outcomes, AI history/privacy controls.
2. **Close role workflow acceptance criteria**: teacher triage actions, parent Today analytics, onboarding resume/completion, Discover personalization, community report/block propagation.
3. **Add proof for external integrations and SLAs**: Google/Outlook calendar sync, realtime messaging delay, moderation propagation under 1 minute, integration alerts under 1 minute, admin pages under 3 seconds.
4. **Broaden quality gates**: Playwright coverage for all redesigned routes, axe coverage for admin/data-heavy surfaces, visual regression snapshots, Lighthouse budgets, and motion performance checks.
5. **Finish governance and rollout evidence**: RBAC/audit-log verification for internal/admin tools, FERPA/COPPA privacy proof for AI and moderation, user guides, in-app tours, pilot report, and production rollout checklist.
