# Migration Notes

- **Base44 export version/date:** Pending — export package not provided in the environment as of 2025-12-17.
- **Migration goals:**
  - Keep the Base44 UI assets available locally in `_base44_export/` for reference during migration.
  - Add missing UI and asset files from the Base44 export without replacing or altering existing repository files unless explicitly required.
  - Track migration findings and follow-up tasks to ensure parity with the Base44 design system.
- **Do not overwrite existing GitHub files; only add missing.**

## Ops Orchestrator (2026-01-22)

- Apply `backend/migrations/20260122_orchestrator_ops.sql` before using the ops orchestrator UI + API.
