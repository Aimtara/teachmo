# Teachmo enterprise UI redesign

## Design system contract

- Enterprise surfaces use `EnterpriseSurface`, `EnterprisePanel`, `EnterpriseFilterBar`, `EnterpriseWorkflowList`, `EnterpriseHeatmap`, and `EnterpriseComplianceStrip`.
- Tokens come from `src/design/tokens.ts` and `src/index.css` via `--enterprise-*`, with light, dark, and `tm-high-contrast` support.
- Motion uses `.enterprise-motion` and `.enterprise-focus`; reduced-motion users receive color and opacity changes without transform transitions.

## Redesigned surfaces

- Onboarding: role-aware setup, saved intent, AI guidance copy, and progressive wizard panels.
- Discover and Community: unified search, filters, personalization, leaderboards, pods, privacy labels, and moderation handoff language.
- Calendar and Messaging: command surfaces for drag-and-drop scheduling, view switching, approval queues, rich chat, attachments, voice notes, and real-time state.
- AI Hub and Settings: chat, quick actions, explainability, privacy opt-out, theme tabs, and instant dark/high-contrast changes.
- Role dashboards: Teacher Triage Board, Parent Today three-card rule, Partner CMS workspace, Admin Trust Console, Integration & Data Health Hub, moderation, directories, and founder tools.
- Continued implementation adds draggable calendar request placement, a message inbox backed by existing messaging APIs with optimistic sends/approvals, partner CMS tabs, data reconciliation/dead-letter UI, and AI governance runbook/rollout controls.

## Accessibility, security, and compliance

- All new interactive controls include visible focus states, labels, and semantic regions.
- Parent Today limits the primary view to three cards to reduce cognitive load.
- AI, directory, moderation, and partner workflows keep privacy scope, auditability, and human review visible.
- No new third-party services or licensed dependencies were added.

## Testing and rollout

- Unit/component coverage lives in `src/components/enterprise/__tests__/EnterpriseSurface.test.tsx`.
- Calendar scheduling helper coverage lives in `src/utils/__tests__/calendarScheduling.test.ts`.
- Storybook coverage lives in `src/components/enterprise/EnterpriseSurface.stories.tsx`, including a high-contrast example.
- Rollout should stage by shell: design-system primitives, parent/teacher role dashboards, family discovery/messaging, partner CMS, then admin trust/data hubs.
- Pilot feedback should validate onboarding completion, parent Today cognitive load, teacher triage speed, moderation propagation, and AI trust comprehension before production enablement.
