# Base44 Legacy Migration Status

_Last updated: 2026-05-04_

## Archival status

The Base44 archive path now exists in-repo as a historical placeholder only.

- Expected archive location: `_base44_export/`
- Current state: placeholder README only (`_base44_export/README.md`); no exported runtime code or assets are present.
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
- `npm run check:api-boundaries` blocks Base44, `@base44/sdk`, and legacy Base44 UI/runtime imports from returning.
- May 4 source scan found only lint restrictions, ADR/migration history, and one compatibility comment in `App.jsx`; no live Base44 import path remains.

### Remaining migration surfaces

- Some documentation still references Base44 historically (ADR and migration notes) for auditability.
- `_base44_export/README.md` is retained as an archive marker so historical migration notes do not point at a missing path. It is not runtime code.

## Next targets

1. Preserve historical Base44 references only where they explain migration history or guardrail policy.
2. Do not add Base44 export payloads back to the application tree unless they are explicitly archived as non-runtime evidence.
