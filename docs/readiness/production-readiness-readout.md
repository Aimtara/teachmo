# Production Readiness Readout

Generated: 2026-05-03  
Latest hardening commit validated locally: `02ff82b`

## Executive summary

Teachmo’s automated production-readiness posture is substantially stronger: tracked Nhost config no longer contains the Google OAuth-secret-looking value, Nhost deploy config is safe by default, secret hygiene now scans broad tracked files for common credential formats, Hasura permission smoke is fail-closed in protected contexts, and release scripts no longer force-push `main:pilot`. Four high-risk UI direct backend exceptions were moved behind domain modules, reducing API-boundary exceptions from 44 to 40. Observability redaction and PII logging checks now cover nested payloads, prompts, vendor payloads, auth material, child/student data, and contact data.

The repository is **not a broad production GO** because live Nhost/Hasura/Sentry, role-token smoke, backup/restore, rollback, compliance/legal, and production user-flow evidence require credentials and human approvals. The technical blocker burn-down has materially improved automated health: full Vitest is green, backend package Jest is green, bundle size is governed by an app-shell/per-chunk/total-JS ratchet, and lint is controlled by a strict ratchet after reducing enforced lint debt from 3,622 to 1,006 reported problems. The current recommendation remains **GO for controlled pilot only after the manual environment verification register is completed and accepted**.

## What changed in this closure

### Security/config
- Removed tracked Google OAuth secret-looking `GOCSPX-...` value from `nhost/nhost.toml`.
- Hardened deployable Nhost config: no wildcard CORS, dev mode off, console off, allowlist on, public DB off, anonymous auth off, email verification on, HIBP on, concealed auth errors on, no `pgdump` API.
- Added local-only Nhost example for developer workflows.
- Added broad secret hygiene scanner/tests and Nhost config safety scanner/tests.
- Documented urgent OAuth secret rotation as manual work.

### Hasura/RBAC
- Permission smoke workflows now call the smoke script directly and fail closed when required secrets are missing in protected/scheduled/manual contexts.
- Hasura readiness checks now inspect workflow fail-closed posture, production Nhost safety wiring, and role-matrix documentation.
- Added role-by-role smoke runbook and evidence template.

### API boundary
- Moved messaging translation, teacher dashboard summary, assignments list/create, and security audit summary fetches behind domain modules.
- Reduced API-boundary temporary exceptions from 44 to 40.
- Added API-boundary exception register for remaining high/medium risks.

### CI/release/static quality
- Added `check:nhost-config-safety` to fast production checks.
- Replaced risky `ship` force-push behavior with safe release check/pilot scripts.
- CI now runs explicit script tests and non-watch Vitest invocation.
- Root Docker runtime no longer installs `serve` globally; it uses package scripts.
- Split vendor chunks for clearer bundle diagnostics. Bundle budget still fails and is documented.
- Added strict lint and bundle-size ratchets to release gates; full Vitest and backend package Jest are now green.

### Observability/PII
- Strengthened redaction for nested arrays/objects, auth headers, cookies, AI prompts, vendor payloads, child/student names, emails, phones, addresses, tokens, and message bodies.
- Expanded PII logging detection tests and scanner patterns.
- Added observability/SLO runbook.

### Docs/evidence
- Updated readiness status, inventory, manual work, TS tracker, G4 environment/release docs, README/docs index, PR template.
- Added Nhost production config runbook, release contract, Hasura permission smoke runbook, SWOT closure, API-boundary exceptions, and evidence templates.

## Tests and checks run

| Command | Result | Notes |
| --- | --- | --- |
| `npm run check:production:fast` | PASS | Includes preflight, secret hygiene, Nhost config safety, API boundaries, auth safety, Hasura readiness, TS ratchet, PII logging. |
| `npm run test:scripts` | PASS | 15 node script tests after adding secret/Nhost/PII coverage. |
| `npm run test:smoke` | PASS | 5 files / 15 tests including expanded redaction coverage. |
| `npm run typecheck` | PASS | New domain modules typecheck. |
| `npm run check:ts-ratchet` | PASS | Current counts: 217 JS, 488 JSX, 314 TS, 65 TSX, 451 any. |
| `npm run build` | PASS | Vite/PWA build succeeds; vendor chunks split for diagnostics. |
| `npm run check:size` | PASS / RATCHETED | Current total 601.25 kB brotlied; initial shell 22.25 kB; largest chunk 224.63 kB. |
| `npm run lint:production` / `npm run check:lint-ratchet` | PASS / RATCHETED | Current controlled debt: 1,006 problems vs 3,573 ratchet baseline. |
| `npm run lint` | RATCHETED | Full legacy lint remains red at 1,006 problems; release gates use the ratchet to block regression. |
| `npm run test -- --run` | PASS | 34 files / 127 tests after discovery and mock fixes. |
| `npm run test:backend` | PASS | 30 suites / 186 tests. |
| `cd backend && npm test` | PASS | Backend package command aligned to root backend Jest config. |
| `npm run check:launch` | PASS | Fast checks, smoke, build, and size ratchet. |
| `npm run check:production` | PASS | Fast checks, lint ratchet, typecheck, full Vitest, build, and size ratchet. |

## Desired future state validation

| Future state item | Achieved? | Evidence | Remaining gap |
| --- | --- | --- | --- |
| Secret hygiene | Yes automated | `check:secret-hygiene` catches OAuth/admin/API/database/private-key patterns. | Rotate leaked Google OAuth secret manually. |
| Nhost config safety | Yes automated | `check:nhost-config-safety`; hardened `nhost/nhost.toml`. | Verify live dashboard/project settings. |
| Hasura permission smoke | Partial/fail-closed | Workflows and readiness script fail closed for protected contexts. | Run live role smoke with real tokens. |
| API boundaries | Improved | Exceptions reduced 44 → 40. | Remaining admin/partner/AI/directory exceptions. |
| Release contract | Improved | Safe `ship`, release contract doc, CI additions. | Live deploy platform evidence. |
| Static quality | Improved/controlled | Typecheck/build/full Vitest/backend Jest pass; lint and bundle ratchets pass. | Full legacy lint still requires owner-led cleanup. |
| Observability/PII | Improved | Redaction and PII tests/checks pass. | Live Sentry/alert/audit evidence. |
| Product launch readiness | Documented | Evidence templates/runbooks. | Real smoke with role users and ops drills. |

## Existing functionality preservation

- No routes, dashboards, migrations, public APIs, or workflows were removed.
- UI behavior was preserved by moving direct calls behind adapters without changing state/response mapping.
- Local developer Nhost workflow remains documented through a local-only example.
- Test-only auth bypass in launch gates remains limited to test context and is blocked in staging/production safety checks.

## Remaining blockers

See `docs/readiness/manual-production-work.md`. Highest priority:

1. Rotate the exposed Google OAuth client secret and attach evidence.
2. Verify staging and production Nhost config/project settings.
3. Run Hasura metadata drift and role-by-role permission smoke.
4. Verify Sentry DSN/release/source-map/redaction/alert routing.
5. Complete backup/restore, rollback, and incident-response drills.
6. Continue lint debt cleanup under the ratchet and decide whether to replace the current total-JS bundle ratchet with a product-approved launch budget.
7. Complete privacy/compliance/AI vendor/legal reviews.

## Verdict

**GO for controlled pilot only after manual environment verification is completed. NO-GO for broad production launch today.**

The automated codebase gates now close the highest false-confidence security and release gaps, but production readiness still depends on privileged live-environment, operational, and compliance evidence.

## Next 7 / 14 / 30 days

- **7 days:** Rotate OAuth secret; assign owners/dates for all manual work; run staging Nhost/Hasura/Sentry verification; approve or refine the bundle budget ratchet.
- **14 days:** Complete live role smoke, backup/restore, rollback, and incident drills; reduce admin/partner/AI API-boundary exceptions.
- **30 days:** Complete compliance/privacy/AI governance reviews; burn down legacy lint debt under the ratchet; run production rehearsal with pilot users and evidence capture.
