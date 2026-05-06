# Teachmo enterprise UI upgrade

## Current-state audit

- Teachmo already uses a React/Vite SPA with shadcn-style UI primitives, Tailwind tokens in `src/index.css`, Storybook, Radix components, Framer Motion, Playwright, Vitest, axe, and role/scopes in `src/config/rbac.ts`.
- Command-center surfaces existed in `src/pages/AdminCommandCenter.jsx` and `src/pages/CommandCenter.jsx`, but the admin page used hard-coded gray styles and a non-virtualized table.
- Tenant branding already injects CSS variables, so the enterprise design system keeps using semantic variables instead of bypassing the theming layer.

## 2026 enterprise UI direction adopted

- Adaptive command-center layout: collapsible sidebar, breadcrumb header, top Ctrl+K command palette, KPI-first stat cards, and progressive action details.
- Ambient AI pattern: command palette explains that AI only surfaces critical approvals, security, adoption, and governance risk.
- Voice-first prototype: command palette can listen for Web Speech commands when supported and falls back to typed search.
- Accessibility as default: light, dark, and high-contrast themes use explicit focus rings, semantic status badges, keyboard row selection, and reduced-motion handling.

## Design system source of truth

- `src/design/tokens.ts` defines the approved palette: Off-White, Slate, Teachmo Blue, Leaf Green, Sunrise Gold, and Coral.
- `src/index.css` exposes enterprise CSS variables for light, dark, and high-contrast themes.
- `src/components/enterprise` contains reusable badges, stat cards, command palette, preference panel, shell, and virtualized data table primitives.

## Component usage

- Use `EnterpriseShell` for admin command-center surfaces that need persistent navigation, breadcrumbs, and Ctrl+K.
- Use `EnterpriseStatCard` for KPI-first dashboard summaries.
- Use `EnterpriseDataTable` for large datasets; it supports virtualization, search, sorting, column toggles, saved views, inline-edit callbacks, keyboard selection, and CSV export.
- Use `useEnterprisePreferences` for local user preferences: theme, density, landing page, notification level, and role context.

## Rollout plan

1. Pilot the upgraded `/admin/command-center` with system admins using the existing protected route.
2. Collect accessibility, keyboard, and density feedback from district and school admins.
3. Extend the enterprise primitives into admin analytics, audit logs, SSO settings, and roster health pages.
4. Add visual regression coverage in Chromatic for each enterprise primitive before broad rollout.
5. Promote high-contrast and motion-performance checks to release blockers after the admin pilot stabilizes.

## Security and privacy notes

- This pass stays in the UI layer and does not alter server RBAC, SSO, or audit-log contracts.
- Production routing remains protected by existing role/scopes; development-only sample rows render only when live action loading fails in dev.
- Inline edits are staged through callbacks only; saving real operational changes still requires existing backend authorization.
