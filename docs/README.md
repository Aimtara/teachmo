# Teachmo Docs

## Architecture Decisions (ADRs)
- Monorepo using Vite + React + Deno deploy functions
- WebSocket for real-time; react-flow for visual builder

## Product Roadmaps
- Phase 1: Procurement-Ready MVP (`phase1-procurement-ready-mvp.md`)

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
