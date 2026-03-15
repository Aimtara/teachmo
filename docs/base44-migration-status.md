# Base44 Legacy Migration Status

_Last updated: 2026-03-14_

## Archival status

The Base44 archive path now exists in-repo.

- Expected archive location: `_base44_export/`
- Current state: placeholder directory committed with archive guidance (`_base44_export/README.md`)
- Source of expectation: `MIGRATION_NOTES.md`

## Migration completion status

Migration is **functionally complete for runtime code paths**.

### Completed in code paths

- Runtime Base44 SDK dependency removed (`@base44/sdk` no longer in dependencies).
- Legacy Base44 client file retired; compatibility behavior now lives in `src/api/compatClient.js`.
- Core/domain/backend adapters route through `apiClient` + Nhost-backed auth.
- Generated/legacy entity exports bridge to `apiClient` rather than direct Base44 client bindings.
- Adapter implementation files were renamed from `.base44.ts` to `.compat.ts` and callers updated.
- Neutral platform exports are active under `src/api/platform/**` (`platformEntitiesMap`, `platformFunctionsMap`, `platformApi`).
- Platform backing maps/functions are implemented under `src/api/legacy/**`.
- Legacy `src/api/base44/**` compatibility wrapper namespace has been fully retired from source.
- Completed an upstream/downstream audit confirming no remaining Base44 references in runtime source/config paths (`src/**`, `App.jsx`, `.env.example`, `eslint.config.js`).

### Remaining migration surfaces

- Remaining Base44 references are documentation-only historical notes for auditability (ADR/migration docs).
- The `_base44_export/` directory currently contains a placeholder README; add the original exported assets when available.

## Next targets

1. Keep docs cleanup incremental (remove non-essential Base44 wording over time while preserving historical records where needed).
2. Replace archive placeholder contents with actual read-only Base44 export payload once available.
