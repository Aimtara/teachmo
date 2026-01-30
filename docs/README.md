# Teachmo Docs

## Architecture Decisions (ADRs)
- Monorepo using Vite + React + Deno deploy functions
- WebSocket for real-time; react-flow for visual builder

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
