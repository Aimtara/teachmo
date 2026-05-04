# Gate 4 — Analytics / Admin Closure

Generated: 2026-05-03

## Status

Gate 4 is **pilot-ready with manual live-proof requirements**. Repository-side admin control-plane surfaces exist, and this closure moved integration health calls behind a domain adapter. Broad production still requires staging/prod proof for sync, analytics, alerting, support publication, and Command Center approvals.

| Item | Current state | Evidence | Launch classification |
| --- | --- | --- | --- |
| E18 Admin sync now + troubleshooting | Partial v0. `AdminIntegrationHealth` now uses `src/domains/integrations/rosterHealth.ts`; additional admin/direct fetch surfaces were reduced in the May 4 adapter pass. `AdminSISSync` still needs larger GraphQL adapter migration. | `npm run check:api-boundaries`: exceptions reduced 37 → 30 in the May 4 pass. | Controlled pilot with mock/dry-run; live integration evidence required. |
| E20 Adoption/delivery/sync dashboards | Partial v0. Admin analytics exists but still has a direct API-boundary exception and needs data-contract validation against staging events. | `docs/readiness/api-boundary-exceptions.md`; `docs/readiness/evidence/admin-sync-dashboard-validation-template.md`; browser smoke now passes for enabled smoke scope. | Pilot blocker until dashboard data is validated with real events. |
| E22 Runbooks + support playbook | Improved. Support playbook added with escalation matrix, incident classes, SLAs, and customer/district templates. | `docs/runbooks/support-playbook.md`. | Manual publication evidence required. |
| E23 Command Center approvals/escalations | Partial v0. Command Center page/domain supports approve/execute/cancel/audit view; live proof template now exists. | `src/pages/AdminCommandCenter.jsx`, `src/domains/commandCenter.ts`, `docs/readiness/evidence/command-center-live-proof-template.md`. | Manual live-proof blocker for broad launch. |

## Required live proof

1. Trigger a dry-run and real sync-now action in staging.
2. Confirm permission guard blocks non-admin roles.
3. Verify audit events include actor, action, status, and reason where required.
4. Validate dashboard rollups against source event counts.
5. Publish support playbook to the support/on-call workspace and attach evidence.
6. Complete Command Center live-proof template with screenshots/log links.

