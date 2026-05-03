# Production Readiness Readout

Generated: 2026-05-03  
Latest closure validation commit: pending final commit after `7b8643e`

## Executive summary

Teachmo’s automated production-readiness posture is substantially stronger. This closure added a production dependency audit gate, removed obsolete vulnerable packages, eliminated parser and `no-undef` lint debt, reduced temporary UI API-boundary exceptions from 40 to 37, tightened the bundle ratchet, added deterministic directory identity mapping, and replaced the unavailable office-hours placeholder with a feature-flagged v0 booking domain/UI.

The repository is **not a broad production GO** because live Nhost/Hasura/Sentry, role-token smoke, backup/restore, rollback, compliance/legal, and production user-flow evidence require credentials and human approvals. Automated launch and production aggregates pass, but browser E2E/a11y still has real product/test failures that must be resolved before broad launch. The current recommendation is **controlled pilot candidate only after manual environment verification and scoped gate decisions are completed and accepted**.

## What changed in this closure

### Security/config
- Added `npm run check:audit` and wired it into fast production checks; the gate fails on unreviewed high/critical production vulnerabilities.
- Removed unused/vulnerable `bundlesize`, `react-quill`, and direct lodash usage; upgraded Vite, DOMPurify, PostCSS, Nodemailer, backend/Nhost function dependencies, and added scoped transitive overrides.
- Production runtime audit now passes with `npm audit --audit-level=high --omit=dev --omit=optional`; remaining full-audit findings are dev/optional build-tool exceptions documented in `config/audit-exceptions.json`.
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
- Moved CCPA geolocation, integration service connect/disconnect, and admin integration health calls behind domain adapters.
- Reduced current API-boundary temporary exceptions from 40 to 37.
- Moved messaging translation, teacher dashboard summary, assignments list/create, and security audit summary fetches behind domain modules.
- Reduced API-boundary temporary exceptions from 44 to 40.
- Added API-boundary exception register for remaining high/medium risks.

### CI/release/static quality
- Full lint remains red but is reduced to 940 problems. Parser and `no-undef` are now zero and ratcheted at zero.
- Bundle ratchet was tightened to total 602 kB, app shell 24 kB, largest chunk 226 kB.
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
- Added evidence templates for Nhost staging/prod verification, Hasura permissions, role smoke, Sentry alert routing, DNS/TLS, storage permissions, OAuth secret rotation, legal/privacy/AI review, and Command Center live proof.
- Added Gate 2/3/4 product closure docs plus support, messaging SLO, digest reliability, and assignments sync runbooks.
- Updated readiness status, inventory, manual work, TS tracker, G4 environment/release docs, README/docs index, PR template.
- Added Nhost production config runbook, release contract, Hasura permission smoke runbook, SWOT closure, API-boundary exceptions, and evidence templates.

## Tests and checks run

| Command | Result | Notes |
| --- | --- | --- |
| `npm run check:production:fast` | PASS | Includes preflight, secret hygiene, Nhost config safety, API boundaries, auth safety, Hasura readiness, TS ratchet, PII logging. |
| `npm run check:audit` | PASS | No unreviewed high/critical production audit findings. |
| `npm audit --audit-level=high --omit=dev --omit=optional` | PASS | Production runtime audit clean. |
| `npm run test:scripts` | PASS | 15 node script tests after adding secret/Nhost/PII coverage. |
| `npm run test:smoke` | PASS | 5 files / 15 tests including expanded redaction coverage. |
| `npm run typecheck` | PASS | New domain modules typecheck. |
| `npm run check:ts-ratchet` | PASS | Current reviewed baseline: 219 JS, 475 JSX, 319 TS, 78 TSX, 512 `any`. Increase is from TSX renames and v0 domain modules; tracked in baseline. |
| `npm run build` | PASS | Vite/PWA build succeeds; vendor chunks split for diagnostics. |
| `npm run check:size` | PASS / RATCHETED | Current total 601.28 kB brotlied; initial shell 22.33 kB; largest chunk 224.63 kB; tightened caps 602/24/226. |
| `npm run lint:production` / `npm run check:lint-ratchet` | PASS / RATCHETED | Current controlled debt: 940 problems; parser and `no-undef` are zero. |
| `npm run lint` | RATCHETED | Full legacy lint remains red at 940 problems; release gates use the ratchet to block regression. |
| `npm run test -- --run` | PASS | 35 files / 145 tests. |
| `npm run test:backend` | PASS | 31 suites / 190 tests after adding identity mapping coverage. |
| `cd backend && npm test` | PASS | Backend package command aligned to root backend Jest config. |
| `npm run check:launch` | PASS | Fast checks, smoke, build, and size ratchet. |
| `npm run check:production` | PASS | Fast checks, lint ratchet, typecheck, full Vitest, build, and size ratchet. |
| `npm run test:e2e` | FAIL | Browser installed and tests ran: 2 pass, 6 fail, 4 skipped. Failures include login color contrast/main landmark, disabled calendar/teacher class routes, keyboard focus expectation, non-admin ops guard, offline service worker timeout. |
| `npm run test:a11y` | FAIL | Jest a11y suite still has CommonJS/ESM/Vite `import.meta` runner issues; 1 smoke a11y test passes. |

## Desired future state validation

| Future state item | Achieved? | Evidence | Remaining gap |
| --- | --- | --- | --- |
| Secret hygiene | Yes automated | `check:secret-hygiene` catches OAuth/admin/API/database/private-key patterns. | Rotate leaked Google OAuth secret manually. |
| Nhost config safety | Yes automated | `check:nhost-config-safety`; hardened `nhost/nhost.toml`. | Verify live dashboard/project settings. |
| Hasura permission smoke | Partial/fail-closed | Workflows and readiness script fail closed for protected contexts. | Run live role smoke with real tokens. |
| API boundaries | Improved | Exceptions reduced 40 → 37 in this closure. | Remaining admin/partner/AI/directory exceptions. |
| Release contract | Improved | Safe `ship`, release contract doc, CI additions. | Live deploy platform evidence. |
| Static quality | Improved/controlled | Typecheck/build/full Vitest/backend Jest pass; lint and bundle ratchets pass. | Full legacy lint still requires owner-led cleanup, now without parser/no-undef debt. |
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
8. Resolve browser E2E/a11y failures before broad production.

## Verdict

**GO for controlled pilot only after manual environment verification is completed. NO-GO for broad production launch today.**

The automated codebase gates now close the highest false-confidence security and release gaps, but production readiness still depends on privileged live-environment, operational, and compliance evidence.

## Next 7 / 14 / 30 days

- **7 days:** Rotate OAuth secret; assign owners/dates for all manual work; run staging Nhost/Hasura/Sentry verification; approve or refine the bundle budget ratchet.
- **14 days:** Complete live role smoke, backup/restore, rollback, and incident drills; reduce admin/partner/AI API-boundary exceptions.
- **30 days:** Complete compliance/privacy/AI governance reviews; burn down legacy lint debt under the ratchet; run production rehearsal with pilot users and evidence capture.
