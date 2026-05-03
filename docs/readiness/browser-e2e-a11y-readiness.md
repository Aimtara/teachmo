# Browser E2E and A11y Readiness

Generated: 2026-05-03

## Commands run

| Command | Result | Notes |
| --- | --- | --- |
| `npm run test:a11y` | FAIL | Jest a11y suite is not currently runnable under Jest CJS. Failures are parser/runtime setup blockers: top-level `await`, Vitest import in Jest, and `import.meta` from Vite env modules. |
| `npm run test:e2e` | BLOCKED initially | Playwright browsers were missing. Error requested `npx playwright install`. |
| `npx playwright install chromium` | PASS | Installed Chromium/headless shell into the local Playwright cache. |
| `npm run test:e2e` after install | FAIL | 2 tests passed, 4 skipped, 6 failed with actionable app/test issues listed below. |

## Playwright after browser install

Passing:

- `admin-flow.spec.ts`: admin dashboard loads.
- `ops.launch-gates.spec.ts`: system_admin can access Ops Orchestrator.

Skipped:

- Enterprise SSO route smoke.
- Tenant isolation SCIM smoke.
- Two role-routing tests.

Failing:

| Test | Failure type | Launch impact |
| --- | --- | --- |
| `a11y.spec.ts` login page | Axe violations: serious color contrast on emerald submit button and missing/main landmarks. | Fix before broad launch; recommended before pilot. |
| `calendar.spec.ts` | Calendar feature flag renders disabled/migration page, so expected calendar text is absent. | Calendar launch scope decision needed. |
| `enterprise-keyboard.spec.ts` | Contact link is visible but not focused after current keyboard sequence. | A11y keyboard-flow fix or test sequence update needed. |
| `ops.launch-gates.spec.ts` non-admin block | Non-admin remains at `/ops/orchestrator`; route guard did not redirect in this browser test setup. | Role guard regression risk; investigate before broad launch. |
| `routing-offline-admin.spec.ts` offline caching | Timed out waiting for `navigator.serviceWorker.ready`. | PWA/offline test needs deterministic service-worker readiness or app fix. |
| `teacher-flow.spec.ts` | Teacher classes route renders disabled/migration page. | Teacher classes launch scope decision needed. |

## Manual fallback checklist

Until automated browser checks are green, release reviewers should manually verify:

1. Login page landmarks and contrast.
2. Protected-route redirect for non-admin users on `/ops/orchestrator`.
3. Admin dashboard loads for an admin/system_admin user.
4. Teacher classes and calendar are either enabled and working or explicitly hidden/gated from launch navigation.
5. Offline/PWA recovery works after a production build and service-worker registration.

