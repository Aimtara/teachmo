# Browser E2E and A11y Readiness

Generated: 2026-05-04

## Current status

Browser QA is materially improved. `npm run test:a11y` now runs the a11y
component/page checks under Vitest instead of the incompatible Jest/CommonJS
runner and passes. After `npm ci`, Playwright browsers had to be reinstalled
with `npx playwright install chromium`; `npm run test:e2e`
now passes all automated smoke tests that do not require external credentials
or a production service-worker environment: **7 passed / 5 skipped / 0 failed**.

The skipped tests are intentional credential/environment gates:

- Enterprise SSO route smoke requires test admin credentials.
- Role-routing smoke with real parent/admin users requires live test credentials.
- Tenant-isolation SCIM smoke requires live tenant/admin tokens.
- Offline/PWA cache smoke requires a production preview/service-worker context;
  it is skipped under the Vite dev server to avoid false failures.

## Commands run

| Command | Result | Notes |
| --- | --- | --- |
| `npm run test:a11y` | PASS | 5 files / 22 tests under Vitest. Replaces the incompatible Jest CJS runner. |
| `npm run test:e2e` | BLOCKED initially | Playwright browsers were missing. Error requested `npx playwright install`. |
| `npx playwright install chromium` | PASS | Installed Chromium/headless shell into the local Playwright cache. |
| `npm run test:e2e` after fixes | PASS / SKIPPED EXTERNAL | 7 passed, 5 skipped, 0 failed. |

## Playwright after browser install

Passing:

- `admin-flow.spec.ts`: admin dashboard loads.
- `a11y.spec.ts`: login page has no detectable axe violations.
- `calendar.spec.ts`: calendar smoke renders when E2E feature flag is enabled.
- `enterprise-keyboard.spec.ts`: AI transparency contact link is keyboard-reachable.
- `ops.launch-gates.spec.ts`: system_admin can access Ops Orchestrator.
- `ops.launch-gates.spec.ts`: non-admin E2E session is blocked from Ops Orchestrator.
- `teacher-flow.spec.ts`: teacher dashboard/classes smoke renders when E2E feature flag is enabled.

Skipped:

- Enterprise SSO route smoke.
- Tenant isolation SCIM smoke.
- Two role-routing tests.
- Offline/PWA caching smoke under Vite dev server.

Resolved failures:

- Login a11y: added a main landmark and darker submit button color.
- Calendar/teacher smoke: added scoped `VITE_FEATURE_*` support for E2E without
  changing default launch flags.
- AI transparency keyboard: updated the smoke test to tab until the visible link
  receives focus.
- Ops route guard: disabled implicit dev route security stripping during E2E,
  added explicit E2E session-role handling, and verified non-admin users are
  blocked.
- Offline smoke: converted to an explicit production-preview requirement instead
  of timing out under Vite dev.

## Manual fallback checklist

Before broad production, release reviewers should still manually verify:

1. Login page landmarks and contrast in the deployed brand/theme.
2. Protected-route redirect for real non-admin users on `/ops/orchestrator`.
3. Admin dashboard loads for a real admin/system_admin user.
4. Teacher classes and calendar are either enabled and working or explicitly
   hidden/gated from launch navigation.
5. Offline/PWA recovery works after a production build and service-worker
   registration.

