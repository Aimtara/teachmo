# Teachmo Docs

## Architecture Decisions (ADRs)
- Monorepo using Vite + React + Deno deploy functions
- WebSocket for real-time; react-flow for visual builder


## AI Governance SSOT
- AI Governance & Delivery Principles (`ai-governance-principles.md`)

## Product Roadmaps
- Phase 1: Procurement-Ready MVP (`phase1-procurement-ready-mvp.md`)
- District Insights Plan (`district-insights-plan.md`)
- Orchestrator Strategic Roadmap (`teachmo-orchestrator-roadmap.md`)

## Orchestrator
- Principles (`teachmo-orchestrator-principles.md`)
- Business Requirements (`teachmo-orchestrator-brd.md`)

## Component Patterns
- All UI uses `cn()` utility
- Component folders = feature-based (e.g., `/messaging`, `/workflows`)

## APIs
- See `src/services/*.ts` for orgService, contentService, etc.
- WebSocket events: `new_message`, `status_update`, `typing`
- SCIM provisioning: `scim.md`

## Storybook
- Run Storybook to document Button, Card, and Tag components.
- Use stories to capture props, accessibility, and state variations.

## Runbooks (Launch Gate G4)

- Release checklist: `runbooks/G4_RELEASE_CHECKLIST.md`
- Rollback: `runbooks/G4_ROLLBACK.md`
- Backup/restore drills: `runbooks/G4_BACKUP_RESTORE.md`
- Incident response: `runbooks/G4_INCIDENT_RESPONSE.md`
- Environment & secrets: `runbooks/G4_ENVIRONMENT.md`
- Hasura production readiness: `runbooks/hasura-production-readiness.md`

## Production Readiness

- Production hardening status: `readiness/production-hardening-status.md`
- Baseline/current inventory: `readiness/production-hardening-inventory.md`
- Manual production work register: `readiness/manual-production-work.md`
- Final readiness readout: `readiness/production-readiness-readout.md`
- Observability standards: `observability.md`
- Feature flags and bypass policy: `feature-flags.md`
