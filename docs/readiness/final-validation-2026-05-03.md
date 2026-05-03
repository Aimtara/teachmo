# Final Validation Evidence — 2026-05-03

Commit validated: `7268417`

## Passed

| Command | Result | Notes |
| --- | --- | --- |
| `npm ci` | PASS | 25 npm audit findings remain (2 low, 11 moderate, 12 high); not changed by this closure. |
| `npm run preflight:example` | PASS | Example env remains valid. |
| `npm run check:secret-hygiene` | PASS | 1,318 tracked files scanned; catches OAuth/client/admin/API key patterns. |
| `npm run check:nhost-config-safety` | PASS | Deployable `nhost/nhost.toml` is safe-by-default. |
| `npm run check:api-boundaries` | PASS | Temporary exceptions reduced to 40 and documented. |
| `npm run check:production-auth-safety` | PASS | 1,318 files scanned. |
| `npm run check:hasura-readiness` | PASS | Repository artifacts/workflow posture present; live verification remains manual. |
| `npm run check:ts-ratchet` | PASS | Current counts: 217 JS, 488 JSX, 314 TS, 65 TSX, 451 `any`, 0 `@ts-ignore`, 0 `@ts-expect-error`. |
| `npm run check:pii-logging` | PASS | 1,058 files scanned with expanded sensitive-pattern coverage. |
| `npm run test:scripts` | PASS | 15 script/check tests pass. |
| `npm run typecheck` | PASS | `tsc --noEmit -p tsconfig.typecheck.json`. |
| `npm run test:smoke` | PASS | 5 files / 15 tests. |
| `npm run test:backend` | PASS | 30 suites / 186 tests. |
| `npm run build` | PASS | Vite/PWA build succeeds; vendor chunks are split for clearer bundle analysis. |
| `npm run check:production:fast` | PASS | Fast production aggregate is green. |
| `npm run check:launch` | PASS | Safety checks + smoke + build are green. |

## Failed / blocked

| Command | Result | Evidence summary |
| --- | --- | --- |
| `npm run lint` | FAIL / pre-existing debt | 3,619 problems (3,462 errors, 157 warnings), including existing parsing/test-global/no-explicit-any issues. |
| `npm run test -- --run` | FAIL / pre-existing test debt | 25 failed files / 32 failed tests / 1,612 passed tests; same legacy mock/governance/AuthGuard style failures as baseline. |
| `npm run check:size` | FAIL / budget decision required | 614 kB brotlied vs 500 kB budget after vendor chunk split; largest remaining chunks: `vendor-misc` 268.97 kB gzip, `vendor-visualization` 90.77 kB gzip, `vendor-react` 58.10 kB gzip. |
| `npm run check:production` | FAIL | Fails because full lint remains red. Fast production checks pass before lint. |
| `cd backend && npm ci && npm test` | FAIL / pre-existing backend package Jest config | Root `npm run test:backend` passes; backend package still exposes ESM/Jest globals and empty-test issues. |
| Browser E2E/a11y | Not run | Requires browser/server orchestration and remains covered by CI/manual evidence templates. |

## Externally blocked production evidence

- Live Nhost staging/production config inspection.
- Google OAuth secret rotation evidence.
- Hasura metadata drift export/apply proof.
- Role-by-role permission smoke with real tokens.
- Sentry release/alert routing evidence.
- Backup/restore, rollback, incident, DNS/TLS, storage, rate-limit, email-template, privacy/legal, AI vendor/DPA evidence.
