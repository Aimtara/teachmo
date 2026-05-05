# Open Findings Remediation Plan

Generated: 2026-05-04  
Applies after readiness closure commit: `6c5af9e`

This plan covers the remaining findings that keep Teachmo from a broad
production recommendation:

1. 30 remaining API-boundary exceptions.
2. Full lint remains ratcheted, not fully clean.
3. Full raw `npm audit` still reports documented dev/optional findings, even
   though the production runtime audit is clean.
4. Live/manual production-readiness work still requires credentials, vendor
   access, legal/compliance review, or human approval.

The goal is to move from **controlled pilot candidate after manual evidence** to
**credible broad production GO** without removing functionality or weakening
security controls.

## Current state and target

| Finding | Current state | Target state | Gate |
| --- | --- | --- | --- |
| API-boundary exceptions | 30 temporary exceptions, hard-ratcheted by `npm run check:api-boundaries` | 0 temporary exceptions, or only explicitly approved server-only/security exceptions | `npm run check:api-boundaries` |
| Full lint | `npm run check:lint-ratchet` passes; full lint remains red at 940 controlled problems | `npm run lint` exits 0; ratchet baseline lowered to 0 | `npm run lint` and `npm run check:lint-ratchet` |
| Raw npm audit | Runtime high/critical audit clean; full raw audit has 6 lower-severity dev/optional findings and 0 high/critical after the May 5 override | Keep full high audit clean; resolve or renew lower-severity exceptions by expiry | `npm run check:audit` plus raw audit review |
| Manual/live evidence | 31 manual work items open | Critical/high items completed with attached evidence and reviewer signoff | Manual work register and evidence templates |

## Workstream A — Eliminate the 30 API-boundary exceptions

### Policy

- UI files in `src/pages/**`, `src/components/**`, and `src/hooks/**` must not
  call raw `fetch`, `graphqlRequest`, platform compatibility clients, Base44, or
  direct admin-secret paths.
- UI must call `src/domains/**`, `src/services/**`, or approved adapters.
- Preserve existing endpoints, query shapes, response shapes, loading states, and
  permission behavior.

### Step-by-step process

1. **Create the exact exception inventory.**
   ```bash
   npm run check:api-boundaries
   ```
   Copy the 30 exception lines into a working issue or tracker grouped by owner:
   Admin Platform, AI Platform, Discover Platform, and Frontend Platform hooks.

2. **Choose one small vertical slice at a time.**
   Recommended order:
   1. Discover feed.
   2. Legacy hooks.
   3. AI prompt library.
   4. Admin GraphQL read-only pages.
   5. Admin REST/fetch pages.
   6. Remaining mutation-heavy admin pages.

3. **Before refactoring each slice, add or identify characterization coverage.**
   For each page/hook:
   - Identify the raw query/endpoint and response fields.
   - Add a unit test for the future domain adapter where feasible.
   - If the UI already has tests, update mocks to mock the domain adapter rather
     than raw GraphQL/fetch.

4. **Create or extend a domain adapter.**
   Examples:
   - `src/domains/discover/feed.ts`
   - `src/domains/profile/myProfile.ts`
   - `src/domains/tenant/featureFlags.ts`
   - `src/domains/tenant/ssoSettings.ts`
   - `src/domains/ai/prompts.ts`
   - `src/domains/admin/dashboard.ts`
   - `src/domains/admin/notifications.ts`
   - `src/domains/admin/observability.ts`
   - `src/domains/admin/sis.ts`
   - `src/domains/admin/partners.ts`

5. **Move only transport logic into the adapter.**
   Keep UI state management in the UI. The adapter should own:
   - endpoint or GraphQL document,
   - variable normalization,
   - auth/header handling if already required,
   - response normalization,
   - redacted error handling where applicable.

6. **Replace the UI import/call site.**
   The UI should import functions from `src/domains/**`.
   Do not leave `fetch`, `graphqlRequest`, or forbidden compatibility imports in
   the UI file.

7. **Run the slice validation.**
   ```bash
   npm run check:api-boundaries
   npm run typecheck
   npm run test:smoke
   npm run test -- --run
   npm run check:lint-ratchet
   ```
   If the slice affects visible UI, run:
   ```bash
   npm run test:e2e
   ```

8. **Lower the API-boundary cap after each successful batch.**
   Update `MAX_TEMPORARY_EXCEPTIONS` in `scripts/check-api-boundaries.mjs`.
   Example: after reducing 30 to 25, set the cap to 25.

9. **Update the exception register after each batch.**
   Update `docs/readiness/api-boundary-exceptions.md` with:
   - new count,
   - removed files,
   - remaining areas,
   - owner and target date.

10. **Commit and push each batch.**
    ```bash
    git add -A
    git commit -m "Reduce <area> API boundary exceptions"
    git push -u origin cursor/teachmo-production-readiness-460a
    ```

### Suggested API-boundary burn-down batches

| Batch | Scope | Likely files | Target count |
| --- | --- | --- | ---: |
| A1 | Discover + hooks | `PersonalizedDiscoverFeed`, `useMyProfile`, `useTenantFeatureFlags`, `useTenantSSOSettings` | 30 → 26 |
| A2 | AI prompt/admin AI read-only | `AIPromptLibrary`, `AdminAIBudgetSettings`, `AdminAICostForecast` | 26 → 23 |
| A3 | Admin dashboard/system health | `AdminDashboard`, `AdminSystemHealth`, `AdminAnalytics` | 23 → 20 |
| A4 | Admin notifications/observability | notification metrics/opt-outs/alerts/observability pages | 20 → 15 |
| A5 | Admin partner surfaces | partner analytics/fraud/payout/referrals | 15 → 11 |
| A6 | SIS/report/subscription surfaces | realtime SIS, role mapping, data manager, report subscriptions | 11 → 6 |
| A7 | Remaining admin mutations | backup recovery, compliance, school requests, users | 6 → 0 |

### Completion criteria

- `npm run check:api-boundaries` passes with `0 temporary exceptions documented`,
  or any remaining exception is formally approved as permanent and moved out of
  the temporary allowlist with security-owner signoff.
- `docs/readiness/api-boundary-exceptions.md` says 0 temporary exceptions.
- Final validation passes:
  ```bash
  npm run check:production:fast
  npm run typecheck
  npm run test -- --run
  npm run test:e2e
  npm run check:production
  ```

## Workstream B — Move full lint from ratcheted to clean

### Policy

- Do not hide real lint debt by broad disabling.
- Parser and `no-undef` must remain 0.
- When count reductions are achieved, lower `scripts/check-lint-ratchet.mjs`.
- Behavior-sensitive React hook fixes require tests or careful manual review.

### Step-by-step process

1. **Capture the current machine-readable lint report.**
   ```bash
   npx eslint src backend --ext .js,.jsx,.ts,.tsx --format json > lint-report.json
   ```
   Then summarize by rule:
   ```bash
   node -e "const r=require('./lint-report.json'); const c={}; for (const f of r) for (const m of f.messages) c[m.ruleId||'parser']=(c[m.ruleId||'parser']||0)+1; console.log(Object.entries(c).sort((a,b)=>b[1]-a[1]));"
   ```
   Delete `lint-report.json` before committing unless intentionally adding it as
   an artifact outside the repo.

2. **Burn down mechanical errors first.**
   Priority order:
   1. `no-unused-vars`
   2. `@typescript-eslint/no-unused-vars`
   3. `no-case-declarations`
   4. `no-redeclare`
   5. `no-prototype-builtins`
   6. `react/jsx-no-undef`

3. **Use safe mechanical rules.**
   - Remove unused imports and local variables.
   - Rename intentionally unused parameters to `_param` only if the lint config
     permits it; otherwise remove the parameter where API-compatible.
   - Add block braces around `case` clauses for `no-case-declarations`.
   - Replace `obj.hasOwnProperty(key)` with
     `Object.prototype.hasOwnProperty.call(obj, key)`.

4. **Handle `@typescript-eslint/no-explicit-any` by boundary.**
   - Prefer `unknown` for untrusted data.
   - Add explicit API response/input types in `src/domains/**`.
   - Use narrow type guards before accessing unknown fields.
   - Avoid global `any` suppressions.

5. **Handle `react-refresh/only-export-components`.**
   - Move constants/helpers from component files to sibling files.
   - Keep component files exporting only React components.
   - Validate HMR-related changes with unit tests or smoke tests.

6. **Handle React hooks last.**
   For each `react-hooks/exhaustive-deps` warning:
   - inspect the hook intent,
   - add missing dependencies when safe,
   - wrap callbacks with `useCallback` only when identity stability matters,
   - add a code comment only when a stale closure is intentional and tested.

7. **Batch lint cleanup by area.**
   Suggested order:
   1. `src/domains/**` and `src/services/**`.
   2. `src/pages/__tests__/**`.
   3. backend route/test files.
   4. low-risk presentational components.
   5. admin pages.
   6. hooks and behavior-sensitive components.

8. **After each batch, lower the ratchet.**
   ```bash
   npm run check:lint-ratchet
   npm run lint
   ```
   Update `scripts/check-lint-ratchet.mjs` to the new lower counts.
   Update `docs/readiness/lint-debt.md`.

9. **Final clean state.**
   Once full lint is clean:
   - set all ratchet counts to 0,
   - change production docs from “ratcheted” to “clean”,
   - update `check:production:fast` only if needed; it can keep running the
     ratchet as a zero-regression gate.

### Suggested lint burn-down milestones

| Milestone | Target | Validation |
| --- | --- | --- |
| L1 | Remove 100+ `no-unused-vars` in tests/domains/services | lint ratchet lowered |
| L2 | Remove all `@typescript-eslint/no-unused-vars` | rule count 0 |
| L3 | Remove `no-case-declarations`, `no-redeclare`, `no-prototype-builtins` | rules 0 |
| L4 | Reduce `@typescript-eslint/no-explicit-any` by 50% | TS ratchet and lint pass |
| L5 | Resolve all `react-refresh` warnings | rule 0 |
| L6 | Resolve hook warnings with tests | rule 0 |
| L7 | Full `npm run lint` exits 0 | production status updated |

## Workstream C — Resolve full raw npm audit findings

### Current raw audit findings

The production runtime audit is clean:

```bash
npm run check:audit
npm audit --audit-level=high --omit=dev --omit=optional
```

The full raw audit still reports dev/optional findings:

- `vite-plugin-pwa` → `workbox-build` → `@rollup/plugin-terser` →
  `serialize-javascript` high chain.
- Storybook `@storybook/addon-essentials` / `@storybook/addon-actions` /
  nested `uuid` moderate chain.
- `@flydotio/dockerfile` / `diff` low chain.
- `ajv` under Workbox moderate chain.

### Step-by-step process

1. **Refresh raw audit.**
   ```bash
   npm ci
   npm audit --audit-level=high --json > audit-full.json
   npm audit --audit-level=high --omit=dev --omit=optional
   ```
   Confirm runtime remains clean.

2. **Check upstream availability before changing versions.**
   ```bash
   npm view vite-plugin-pwa version
   npm view workbox-build version
   npm view @rollup/plugin-terser version
   npm view serialize-javascript version
   npm view @storybook/addon-essentials version
   npm view @storybook/addon-actions version
   npm view @flydotio/dockerfile version
   ```

3. **Try safe patch/minor upgrades first.**
   ```bash
   npm update vite-plugin-pwa workbox-build @rollup/plugin-terser serialize-javascript
   npm update @storybook/addon-essentials @storybook/addon-actions
   npm update @flydotio/dockerfile
   npm audit --audit-level=high --json
   ```

4. **If upstream ranges block patched transitive versions, test overrides.**
   Add temporary overrides only when compatible:
   ```json
   {
     "overrides": {
       "serialize-javascript": "latest",
       "ajv": "latest",
       "uuid": "latest",
       "diff": "latest"
     }
   }
   ```
   Then run:
   ```bash
   npm install
   npm run build
   npm run check:size
   npm run test:a11y
   npm run test:e2e
   npm run check:production
   ```

5. **For the PWA chain, validate service-worker output.**
   ```bash
   npm run build
   rg "serialize-javascript|workbox|precache" dist
   npm run test:e2e
   ```
   Then perform a production-preview offline smoke in a browser:
   ```bash
   npm run preview
   ```
   Verify:
   - service worker registers,
   - core route reloads,
   - offline fallback works,
   - no untrusted user data is serialized into the service worker.

6. **For Storybook, validate Storybook separately.**
   ```bash
   npm run build-storybook
   ```
   If a major Storybook upgrade is required, create a separate Storybook
   migration branch and do not mix it with app-runtime changes.

7. **If raw audit cannot be made clean safely, formalize the exception.**
   Update:
   - `config/audit-exceptions.json`,
   - `docs/readiness/dependency-security-burndown.md`,
   - release-risk register.

   Each exception must include:
   - advisory/package,
   - severity,
   - exposure,
   - why no safe fix exists,
   - mitigation,
   - owner,
   - expiry date no later than the next dependency review window.

8. **Final desired state.**
   ```bash
   npm audit --audit-level=high
   npm run check:audit
   npm run check:production
   ```
   Full raw audit should be clean. If not, Security must explicitly approve the
   documented non-runtime exception before broad production.

## Workstream D — Complete live/manual production-readiness evidence

The following steps complete the remaining manual work. Use the evidence
templates linked in `docs/readiness/manual-production-work.md`.

### D1 — Nhost staging and production verification

1. Log into Nhost with staging admin access.
2. Link or select the staging project.
3. Capture project ID, region, app URL, GraphQL URL, and auth URL.
4. Compare dashboard settings against `docs/runbooks/nhost-production-config.md`:
   - CORS allowlist has no wildcard production origins.
   - dev mode disabled.
   - console disabled for production.
   - public DB access disabled.
   - anonymous auth disabled unless formally approved.
   - email verification enabled.
   - HIBP/check leaked passwords enabled.
   - auth errors concealed.
5. Repeat for production.
6. Attach screenshots/exports to:
   - `docs/readiness/evidence/staging-nhost-verification-template.md`
   - `docs/readiness/evidence/production-nhost-verification-template.md`

### D2 — Hasura metadata and RBAC verification

1. Export staging metadata from Hasura/Nhost.
2. Diff exported metadata against repo metadata/migrations.
3. Review permissions for parent, teacher, partner, school admin, district admin,
   system admin.
4. With real role tokens, test allowed and denied operations for select, insert,
   update, and delete where applicable.
5. Confirm denied operations fail closed with no cross-tenant leakage.
6. Attach role matrix and output to
   `docs/readiness/evidence/hasura-permissions-review-template.md`.

### D3 — OAuth secret rotation

1. In Google Cloud Console, rotate the OAuth client secret that was previously
   exposed.
2. Revoke or invalidate the old secret.
3. Update Nhost/Auth provider settings or secret manager with the new value.
4. Deploy or reload auth configuration.
5. Complete Google login smoke in staging.
6. Attach rotation timestamp, old-secret invalidation screenshot, Nhost setting
   screenshot, and successful login proof to
   `docs/readiness/evidence/oauth-secret-rotation-template.md`.

### D4 — Sentry and alert routing

1. Confirm Sentry DSN is configured only through environment/secret manager.
2. Deploy staging with release/build SHA.
3. Trigger a test frontend error and backend/API error.
4. Confirm events are redacted and linked to release/source maps.
5. Configure alert routing to on-call channel.
6. Trigger a test alert and confirm receipt/escalation.
7. Attach proof to `docs/readiness/evidence/sentry-alert-routing-template.md`.

### D5 — Backup/restore, rollback, and incident drills

1. Take a staging database backup.
2. Restore it to a throwaway database/project.
3. Validate `/healthz`, core GraphQL queries, and a role smoke.
4. Deploy a known build to staging.
5. Roll back to the previous build.
6. Confirm `/healthz` build SHA and route smoke after rollback.
7. Run one incident-response tabletop using the G4 incident runbook.
8. Attach evidence to:
   - `backup-restore-drill-template.md`
   - `rollback-drill-template.md`
   - `incident-response-rehearsal-template.md`

### D6 — Role smoke and browser verification

1. Prepare real staging users for parent, teacher, partner, school admin,
   district admin, and system admin.
2. Run:
   ```bash
   npm run test:e2e
   ```
3. Run skipped credential-dependent specs with required environment variables:
   - SSO/admin settings credentials,
   - tenant isolation/SCIM credentials,
   - prod-like PWA/offline preview environment.
4. Manually verify:
   - login,
   - dashboards by role,
   - directory,
   - messaging,
   - assignments,
   - calendar/office-hours if in launch scope,
   - admin command center,
   - non-admin route denial.
5. Attach proof to `role-smoke-test-template.md` or
   `production-smoke-template.md`.

### D7 — Storage, DNS/TLS, email/auth, and rate limits

1. Review Nhost storage bucket policies by role.
2. Test upload/download allowed and denied cases.
3. Verify DNS, TLS, HSTS, canonical redirects, and staging/prod domains.
4. Verify auth/email templates for invite, reset, verification, and redirect
   allowlist.
5. Configure and test rate limits for auth, invites, messaging, AI, and admin
   endpoints.
6. Attach proof to the storage, DNS/TLS, and staging/production smoke templates.

### D8 — Legal, privacy, data governance, and AI governance

1. Review COPPA/FERPA/K-12 privacy obligations.
2. Review privacy policy, consent flows, retention/deletion windows, and DSAR
   process.
3. Review AI vendors, prompt/data payloads, opt-out behavior, and DPAs.
4. Confirm support/on-call ownership and break-glass admin process.
5. Attach approvals to `legal-privacy-ai-review-template.md` and relevant
   runbook evidence.

### D9 — Gate 2/3/4 live proof

1. Directory:
   - run import preview with exact matches, manual review, conflicts,
   - approve/reject at least one conflict with reason,
   - attach `directory-identity-conflict-review-template.md`.
2. Office hours:
   - create teacher availability,
   - book/cancel/reschedule as parent,
   - test timezone behavior,
   - attach `office-hours-live-verification-template.md`.
3. Messaging/digest:
   - trigger retryable failure,
   - verify retry/backoff/idempotency,
   - run digest recovery,
   - attach `messaging-digest-retry-proof-template.md`.
4. Assignments:
   - run dry-run sync,
   - inspect status/errors,
   - run live sync if LMS credentials exist,
   - attach `assignments-sync-live-proof-template.md`.
5. Admin dashboards:
   - trigger sync-now/troubleshooting flow,
   - reconcile adoption/delivery/sync counts to source events,
   - attach `admin-sync-dashboard-validation-template.md`.

## Final broad-production readiness gate

Do not recommend broad production until all of the following are true:

```bash
npm ci
npm run check:production:fast
npm run check:audit
npm audit --audit-level=high
npm run lint
npm run check:api-boundaries
npm run typecheck
npm run test -- --run
npm run test:backend
npm test --prefix backend
npm run test:smoke
npm run test:a11y
npm run build
npm run check:size
npm run test:e2e
npm run check:launch
npm run check:production
```

Manual evidence requirements:

- all Critical manual work items complete,
- all High manual work items complete or formally waived by Security/Product,
- OAuth secret rotation proof attached,
- live role smoke attached,
- legal/privacy/AI governance signoff attached,
- remaining API-boundary/lint/audit debt is zero or formally accepted with
  owner and expiry.

## Recommended sequencing

### Next 7 days

1. Assign owners and target dates for every manual work item.
2. Rotate OAuth secret.
3. Complete staging Nhost/Hasura/Sentry verification.
4. Burn down API exceptions A1 and A2.
5. Start lint milestones L1 and L2.

### Next 14 days

1. Complete backup/restore, rollback, DNS/TLS, storage, and role-smoke proof.
2. Burn down API exceptions A3 through A5.
3. Resolve or formally renew raw audit exceptions.
4. Complete Storybook/PWA audit compatibility spike.

### Next 30 days

1. Reach zero API-boundary exceptions.
2. Reach clean `npm run lint`.
3. Reach clean full raw `npm audit --audit-level=high`, or obtain formal
   Security signoff for any non-runtime exception.
4. Complete Gate 2/3/4 live proof.
5. Run full production rehearsal and update final readout to a broad-production
   GO only if evidence supports it.
