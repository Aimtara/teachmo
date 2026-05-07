# Enterprise UI redesign burndown

This tracker converts the enterprise UI redesign plan into updateable workstreams. Status values:

- `Done`: merged in this branch and verified with automated checks or walkthrough evidence.
- `Partial`: visible UI exists, but production persistence, integrations, analytics, or full acceptance evidence is incomplete.
- `Not started`: no meaningful implementation in this branch.

## Rollup

| Status | Count | Notes |
| --- | ---: | --- |
| Done | 4 | Foundation, settings themes, parent Today, teacher triage. |
| Partial | 15 | Most redesigned surfaces have shells/interactions but need backend, realtime, or measurement work. |
| Not started | 6 | Research, visual/perf expansion, staged rollout, training, and production feedback loops. |

## Burndown by workstream

| ID | Workstream | Status | Current evidence | Remaining completion criteria |
| --- | --- | --- | --- | --- |
| UI-001 | Enterprise design system tokens, themes, surface primitives, motion/focus rules | Done | `src/components/enterprise/EnterpriseSurface.tsx`, `src/index.css`, Storybook story, component test | Keep tokens enforced during future page conversions. |
| UI-002 | Storybook component documentation and high-contrast examples | Partial | `src/components/enterprise/EnterpriseSurface.stories.tsx` | Add stories for onboarding wizard, partner CMS, calendar, messaging, trust/data hubs. |
| UI-003 | Role-aware onboarding with autosave and AI guidance | Partial | `src/pages/OnboardingPage.tsx` uses saved intent and enterprise shell | Add complete parent/teacher/partner/admin step sets, localization, analytics, completion-rate measurement. |
| UI-004 | Discover personalization, filters, saved search, community result blending | Partial | `src/pages/UnifiedDiscover.jsx` shell and filters | Add real personalized ranking, saved searches, infinite scroll, community result integration, load-time proof. |
| UI-005 | Community feed, pods, leaderboards, post creation, reporting | Partial | `src/pages/UnifiedCommunity.jsx` shell and workflow states | Implement create/edit/delete posts, pods, rich content, leaderboards, block/report propagation. |
| UI-006 | Calendar scheduling with multiple views and agenda | Partial | `src/pages/Calendar.jsx`, `src/utils/calendarScheduling.ts`, verified walkthrough, optimistic `createEvent` persistence path | Add update/delete persistence, event creation wizard, external calendar sync, reminders, and live retry queue. |
| UI-007 | Messaging rich chat and approvals | Partial | `src/pages/Messages.jsx` supports threads, optimistic send, approval badge | Add realtime updates, attachments, voice notes, notification preferences, approval persistence proof. |
| UI-008 | Unified AI hub with chat, quick actions, explainability, privacy controls | Partial | `src/pages/AIAssistant.jsx` enterprise hub wrapper | Merge explainability route behavior, add history view/delete, voice commands, measured <3s response evidence. |
| UI-009 | Settings tabs, instant themes, privacy controls | Done | `src/pages/Settings.jsx`, high-contrast walkthrough | Connect all controls to persisted user preferences APIs. |
| UI-010 | Parent Today three-card rule and weekly brief | Done | `src/pages/ParentDashboard.jsx`, walkthrough evidence | Add adoption analytics and measured workflow simplification. |
| UI-011 | Teacher triage board with smart queues and heatmap | Done | `src/pages/TeacherDashboard.jsx`, walkthrough evidence | Wire queues to live messages, office hours, digest approvals, and intervention actions. |
| UI-012 | Partner CMS workspace, assets, analytics, compliance | Partial | `src/pages/PartnerPortal.jsx` tabs and submission form | Add real asset upload storage, compliance document upload, analytics export, approval history. |
| UI-013 | Admin command center and district dashboards | Partial | Existing command center plus enterprise shell direction | Finish modular dashboards for `/admin`, `/district/overview`, analytics, observability, workflows. |
| UI-014 | AI Governance & Trust Console | Partial | `src/pages/AdminAIGovernance.jsx` runbook and rollout mode | Wire incident/runbook queue, policy simulation results, audit log table/export, enforcement telemetry. |
| UI-015 | Integration & Data Health Hub | Partial | `src/pages/AdminIntegrationHealth.jsx` reconciliation and dead-letter retry UI | Add self-serve setup flows, conflict resolution persistence, retry backend actions, alert SLA proof. |
| UI-016 | Moderation and blocklist workflows | Partial | `src/pages/AdminModerationQueue.jsx` enterprise moderation shell | Add batch actions, AI moderation explanations, propagation telemetry, two-click resolution proof. |
| UI-017 | AI fine-tuning and training UI | Partial | `src/pages/AIFineTuning.jsx` lifecycle/wizard UI | Add dataset upload, privacy scan integration, training job monitoring, rollback actions. |
| UI-018 | Transparency page and school directory | Partial | `src/pages/AITransparency.jsx`, `src/pages/SchoolDirectory.jsx` enterprise shells | Add interactive infographics, advanced directory search/contact cards, data export tools. |
| UI-019 | Founder/internal tools | Partial | `src/pages/FounderDashboard.jsx` enterprise shell | Add KPI charts, filters, experiment controls, strict audit logging. |
| UI-020 | Accessibility verification across redesigned surfaces | Partial | Existing a11y suite passes | Add axe coverage for newly redesigned calendar, messaging, partner, admin data, and governance pages. |
| UI-021 | Performance budgets and bundle monitoring | Partial | `npm run build && npm run check:size` passes | Add route-level Lighthouse/perf budgets and motion performance checks. |
| UI-022 | Visual regression coverage | Not started | None in this branch | Add Storybook/Chromatic or equivalent snapshots for redesigned surfaces. |
| UI-023 | E2E coverage for role workflows | Partial | `tests/e2e/enterprise-workflows.spec.ts` covers calendar scheduling, messaging approval, partner tabs, data retry, governance mode | Extend Playwright coverage to onboarding, discover/community, role dashboards, moderation, transparency, directories, and error states. |
| UI-024 | Security/compliance backend proof | Not started | UI copy and no new dependencies | Add RBAC/SSO/audit-log verification for all admin/internal workflow actions. |
| UI-025 | User research and measurable acceptance outcomes | Not started | None in this branch | Run role research, usability tests, onboarding + triage + Today analytics comparisons. |
| UI-026 | Training materials, in-app tours, staged rollout | Not started | Rollout notes in `docs/enterprise-ui-redesign.md` | Create user guides, tour assets, pilot plan, feedback report, production rollout checklist. |
| UI-027 | Production data and third-party integration completion | Not started | Demo/local state for several workflows | Connect live services for calendar providers, messaging realtime, partner storage, AI governance, data health. |

## Next recommended burn order

1. Persist messaging approval state and calendar reschedules through existing APIs.
2. Add partner asset/compliance upload flows with storage and audit events.
3. Back integration retry/reconciliation and AI governance rollout controls with backend actions and audit logs.
4. Extend Playwright coverage to the remaining redesigned routes and error states.
5. Expand axe/visual/performance checks to all newly redesigned route surfaces.
