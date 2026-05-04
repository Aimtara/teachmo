# Teachmo GO/NO-GO Closure Execution Plan (May 4, 2026)

## Purpose

This plan translates the consolidated follow-up list into an executable program that separates:

1. **Mandatory manual environment verifications** (cannot be auto-closed).
2. **Automatable technical debt and regression controls** (can be enforced in CI).
3. **Gate 2/3/4 completion evidence** (must be demonstrated or feature-gated).

---

## A. Mandatory manual verifications (cannot be automated away)

> These remain release blockers for broad production GO until evidence is attached.

| ID | Work item | Why manual | Evidence required | Owner | Target date | Status |
| --- | --- | --- | --- | --- | --- | --- |
| MV-01 | Google OAuth secret rotation | Requires cloud-console and secret custody actions | Screenshot/log of revoke + new secret created; deployment proof; role login checks | IAM/Security | TBD | [ ] |
| MV-02 | Staging/prod Nhost config verification | Requires live dashboard checks | Screenshot pack: redirect URIs, CORS, DB access mode, auth settings | Platform | TBD | [ ] |
| MV-03 | Live Hasura metadata + RBAC verification | Requires live metadata export + role tokens | Metadata diff artifact + permission matrix by role | Platform + QA | TBD | [ ] |
| MV-04 | Real role smoke tests (Parent/Teacher/Partner/Admin/Ops) | Needs human role-based UX validation | Test case log + screenshot evidence per role | QA/Product | TBD | [ ] |
| MV-05 | Sentry + alert routing drill | Needs live error injection and alert receipt | Intentional error trace + Slack/email alert screenshots | SRE | TBD | [ ] |
| MV-06 | Backup and restore drill | Must validate live backup/restore path | Restore logs + data integrity checklist | SRE/DBA | TBD | [ ] |
| MV-07 | Rollback drill | Requires deployment pipeline and rollback action | Forward/rollback timeline + healthz and route checks | Release Eng | TBD | [ ] |
| MV-08 | DNS/TLS/domain verification | External DNS/TLS posture check | DNS record snapshots + SSL audit report + HSTS proof | Infra | TBD | [ ] |
| MV-09 | Storage bucket permissions verification | Requires role-token file ops in live storage | Read/write matrix with positive and negative tests | Platform/Sec | TBD | [ ] |
| MV-10 | Legal/privacy review (COPPA/FERPA, policy) | Requires legal sign-off | Signed review record + updated policy references | Legal/Privacy | TBD | [ ] |
| MV-11 | AI governance review finalization | Requires policy + risk sign-off | AI governance sign-off + HITL approval flow evidence | AI Owner | TBD | [ ] |
| MV-12 | Support and on-call readiness | Requires staffing/rota confirmation | On-call roster + escalation drill output | Ops | TBD | [ ] |

---

## B. Automatable controls and CI enforcement

## B1) Security and dependency automation

### Implement/verify
- Add/verify `npm run check:audit` that:
  - Runs `npm audit --audit-level=high --json`.
  - Fails on unapproved highs.
  - Allows only expiring exceptions with owner, mitigation, and expiration date.
- Add `docs/readiness/dependency-security-burndown.md` with current vulnerabilities and mitigation ownership.

### Exception file schema (recommended)
- `config/audit-exceptions.json`
- Fields per exception:
  - `package`, `advisory`, `severity`, `exposure`, `mitigation`, `owner`, `expires_on`, `ticket`

## B2) API-boundary automation

### Implement/verify
- Keep `check:api-boundaries` mandatory in CI.
- Add `docs/readiness/api-boundary-exceptions.md` with every remaining exception row and target closure date.
- Ratchet policy:
  - Exception count must never increase.
  - New exception requires owner + risk + target + issue link.

## B3) Lint debt ratchet automation

### Implement/verify
- Restore or replace `check:lint-ratchet` with current eslint output model.
- Store baseline in repo and enforce non-regression on errors/selected rules.
- Focus burn-down buckets:
  - parser errors
  - `no-undef`
  - mechanical `no-unused-vars`

## B4) Bundle-size automation

### Implement/verify
- Keep `npm run build` + `npm run check:size` in CI.
- Document hybrid budget policy in `docs/readiness/bundle-size-plan.md`:
  - app-shell cap
  - largest chunk cap
  - total-js non-regression ratchet

## B5) Metadata/schema automation

### Implement/verify
- CI check for Hasura metadata drift (export + diff strategy).
- CI check for migration ordering and reproducibility.
- Document in readiness docs how to run drift checks locally and in CI.

## B6) Quality/synthetic monitoring automation

### Implement/verify
- Scheduled synthetic checks (healthz + key role routes where possible).
- Playwright smoke path for critical flows (auth bypass test mode only).
- a11y smoke in CI for core routes.

---

## C. Gate closure execution (feature completion or explicit gating)

## Gate 2 — Integrations/Directory

Required closure evidence:
- CSV import and OneRoster-lite flow proof.
- Deterministic identity mapping (E13) evidence with conflict handling.
- Directory approval workflow evidence with reviewer actions.

If not ready:
- Feature-flag non-critical paths and document launch impact.

## Gate 3 — Messaging/Assignments/Scheduling

Required closure evidence:
- Messaging delivery/retry reliability signals.
- Digest reliability + retry/recovery proof.
- Office hours booking (E16) v0 implemented **or** explicitly gated with launch blocker notes.
- Assignments sync v0 evidence.

## Gate 4 — Analytics/Admin

Required closure evidence:
- Admin sync and troubleshooting flow evidence.
- Dashboard data-contract validation evidence.
- Command-center escalation and support playbook publication evidence.

---

## D. Final readiness report structure (version-controlled)

Create/update final report with these sections:

1. **Environment verification evidence index** (MV-01..MV-12)
2. **Technical debt closure summary** (audit/lint/api boundary/bundle)
3. **Gate 2/3/4 status** (done, gated, or blocked with reason)
4. **Approvals** (Legal, Privacy, AI Governance, Ops)
5. **GO/NO-GO decision** with explicit unresolved blockers (if any)

Recommended file:
- `docs/readiness/final-go-no-go-readiness-report.md`

---

## E. Suggested execution order (systematic)

1. Lock CI ratchets (audit, lint, API boundary, size) so debt cannot regress.
2. Run MV-01..MV-12 evidence program in staging/prod with owners and dates.
3. Parallel Gate 2/3/4 implementation-or-gating decisions (E13/E16 priority).
4. Publish closure docs and evidence links.
5. Conduct launch decision meeting with versioned GO/NO-GO report.

---

## F. Definition of “Production GO”

Production GO is only valid when:

- All MV critical manual checks are complete with evidence.
- No unreviewed high vulnerabilities remain.
- API-boundary and lint ratchets are enforced and non-regressing.
- Gate 2/3/4 are complete or deliberately feature-gated with documented launch impact.
- Final readiness report and cross-functional approvals are signed.
