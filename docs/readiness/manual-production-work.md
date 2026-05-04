# Manual Production Work Register

These items require live environment access, human approval, vendor-console access, or legal/compliance ownership. They are **not complete** until evidence is attached by the listed owner.

Every item in this register must produce an evidence packet before it can be marked complete. Evidence packets must include the executor, reviewer, environment, timestamp, command/dashboard path, expected result, actual result, attached screenshots/logs, and a pass/fail decision. Templates live under `docs/readiness/evidence/`.

| ID | Category | Severity | Manual task | Why it cannot be automated here | Exact steps | Required access/credentials | Owner placeholder | Target date placeholder | Evidence required | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MPW-001 | Nhost | Critical | Verify real staging Nhost project | Requires staging Nhost access | `nhost link`; select staging; run metadata/migration status command; capture project ID | Nhost staging admin | TBD | TBD | Command output + screenshot | [ ] manual |
| MPW-002 | Nhost | Critical | Verify real production Nhost project | Requires production Nhost access | Link prod project; verify app/env/project IDs; confirm no local/test config | Nhost production admin | TBD | TBD | Command output + screenshot | [ ] manual |
| MPW-003 | Hasura | Critical | Hasura metadata export/import drift check | Requires live console/admin secret | Export metadata from staging/prod; compare to repo; apply in staging dry run if supported | Hasura admin secret / Nhost admin | TBD | TBD | Diff report | [ ] manual |
| MPW-004 | Hasura/RBAC | Critical | Table permission review by role | Requires live data and role tokens | For parent, teacher, partner, school_admin, district_admin, system_admin: select/insert/update denied/allowed table matrix | Role test users/tokens | TBD | TBD | Permission matrix | [ ] manual |
| MPW-005 | Auth/CORS | Critical | Staging JWT and CORS validation | Requires deployed staging domains | Verify Nhost JWT claims, allowed roles, allowed origins, auth redirects | Nhost auth settings | TBD | TBD | Screenshot + curl/browser evidence | [ ] manual |
| MPW-006 | Observability | High | Sentry project/DSN/release verification | Requires Sentry access | Set DSN; deploy staging; confirm release/build SHA and redaction | Sentry project admin | TBD | TBD | Sentry release link | [ ] manual |
| MPW-007 | Data recovery | Critical | Backup/restore drill | Requires database snapshot controls | Take staging backup; restore to throwaway; validate `/healthz` and core queries | Nhost/Postgres admin | TBD | TBD | Restore log | [ ] manual |
| MPW-008 | Release ops | High | Rollback drill | Requires deploy platform access | Deploy known build; rollback; confirm healthz SHA and route smoke | Deploy admin | TBD | TBD | Timeline + screenshots | [ ] manual |
| MPW-009 | Incident response | High | Incident response rehearsal | Human process validation | Run tabletop using G4 incident runbook; confirm roles/escalation | Eng/Product/Support leads | TBD | TBD | Signed notes | [ ] manual |
| MPW-010 | QA | Critical | Production smoke with real roles | Requires real staging/prod users | Login and smoke parent, teacher, partner, admin, ops, messaging, discover | Test users | TBD | TBD | Checklist evidence | [ ] manual |
| MPW-011 | Compliance | Critical | K-12 privacy/COPPA/FERPA/legal review | Requires counsel/privacy officer | Review data flows, consent, retention, privacy policy, vendor DPAs | Legal/compliance | TBD | TBD | Approval record | [ ] manual |
| MPW-012 | Data governance | High | District pilot retention policy decision | Business/legal decision | Decide retention/deletion windows for student/child/message/audit data | Product/legal | TBD | TBD | Approved policy | [ ] manual |
| MPW-013 | Support | High | Support/on-call ownership | Business ops decision | Assign on-call, escalation, SLA, runbook owner | Eng/support leadership | TBD | TBD | Roster + escalation policy | [ ] manual |
| MPW-014 | AI governance | High | AI vendor/data-processing review | Requires vendor/legal review | Confirm AI features, prompts, data sent, DPAs, opt-out | Legal/product/AI owner | TBD | TBD | Review signoff | [ ] manual |
| MPW-015 | Monitoring | High | Real alert routing | Requires monitoring tools | Configure Sentry/uptime/DB alerts to on-call; test alert | Sentry/monitoring admin | TBD | TBD | Alert receipt evidence | [ ] manual |
| MPW-016 | DNS/TLS | High | Domain/DNS/certificate verification | Requires registrar/deploy access | Verify DNS, TLS, HSTS, redirects for prod/staging | DNS/deploy admin | TBD | TBD | SSL test output | [ ] manual |
| MPW-017 | Email/Auth | High | Email templates and auth redirect URLs | Requires Nhost/email provider access | Verify reset/invite/verification templates and redirect allowlist | Nhost/email admin | TBD | TBD | Test email + settings screenshot | [ ] manual |
| MPW-018 | Storage | Critical | Storage bucket permissions | Requires Nhost storage config | Review bucket policies by role; test upload/download denies | Nhost admin | TBD | TBD | Permission matrix | [ ] manual |
| MPW-019 | Abuse controls | High | Production rate limits and abuse controls | Requires infra/API gateway decisions | Configure rate limits for auth, messaging, invites, AI endpoints | Infra/backend owner | TBD | TBD | Config + load-test evidence | [ ] manual |
| MPW-020 | Security | Critical | Break-glass admin process | Human security process | Define break-glass account custody, approval, audit review | Security/leadership | TBD | TBD | Approved SOP | [ ] manual |
| MPW-021 | Privacy | Critical | Data deletion/export request process | Human/legal process + live workflow | Define DSAR intake, export, deletion, exception logging | Privacy/support/data owner | TBD | TBD | SOP + test request evidence | [ ] manual |
| MPW-023 | Secrets | Critical | Rotate exposed Google OAuth client secret | A real-looking OAuth secret was present in tracked Nhost config before this closure. Rotation requires Google Cloud/Nhost access. | In Google Cloud Console rotate the OAuth client secret; invalidate/revoke the old secret; update Nhost dashboard/secret manager; deploy; verify Google login; attach screenshots/rotation log. | Google Cloud OAuth admin, Nhost production admin | TBD | TBD | Rotation timestamp, old-secret invalidation evidence, Nhost setting screenshot, successful login evidence | [ ] manual |
| MPW-024 | Nhost config | Critical | Verify production Nhost config matches safe repo policy | Provider dashboard settings may differ from tracked config. | Compare production/staging dashboard CORS, dev mode, console, allowlist, public DB access, anonymous auth, email verification, HIBP, and error concealment against `docs/runbooks/nhost-production-config.md`. | Nhost production/staging admin | TBD | TBD | Completed config matrix and screenshots | [ ] manual |
| MPW-025 | Bundle budget | Medium | Approve or reduce production bundle budget | Current app exceeds the 500 kB brotli aggregate budget; safe vendor chunking improved diagnosis but not pass/fail. | Review build output, decide whether to lazy-load additional heavy features or approve revised aggregate budget; capture decision. | Frontend lead / product owner | TBD | TBD | `npm run build`, `npm run check:size` output and approval note | [ ] manual/decision |
| MPW-026 | Observability | High | SLO and alert routing live verification | Requires live Sentry/monitoring/on-call systems. | Configure alerts from `docs/runbooks/observability-and-slos.md`, trigger test alert, confirm on-call receipt and escalation. | Sentry/monitoring admin, on-call lead | TBD | TBD | Alert screenshot, incident channel receipt, escalation notes | [ ] manual |
| MPW-027 | Directory | High | Directory identity conflict review proof | Requires staging import data and reviewer signoff | Run a CSV/OneRoster-lite preview with exact matches, manual-review candidates, and conflicts; reject or approve at least one conflict with reason capture. | Directory admin, staging test data | TBD | TBD | `docs/readiness/evidence/directory-identity-conflict-review-template.md` | [ ] manual |
| MPW-028 | Scheduling | High | Office-hours live verification | Requires live parent/teacher users and backend persistence/notification wiring | Enable office hours for a scoped tenant; create availability; book/cancel/reschedule across time zones; verify audit and notification evidence. | Teacher/parent test users, staging backend admin | TBD | TBD | `docs/readiness/evidence/office-hours-live-verification-template.md` | [ ] manual |
| MPW-029 | Messaging/Digest | High | Messaging retry and digest recovery proof | Requires staging queue/scheduler controls | Trigger retryable messaging failure and weekly digest recovery run; confirm idempotency and alerting evidence. | Messaging ops, scheduler/admin access | TBD | TBD | `docs/readiness/evidence/messaging-digest-retry-proof-template.md` | [ ] manual |
| MPW-030 | Assignments | High | Assignments sync live/dry-run proof | Requires LMS test tenant or approved mock | Run dry-run assignment sync, validate status/errors, then execute live staging sync if credentials exist. | LMS test credentials, teacher admin | TBD | TBD | `docs/readiness/evidence/assignments-sync-live-proof-template.md` | [ ] manual |
| MPW-031 | Admin analytics | High | Admin sync and dashboard validation proof | Requires staging event/source data | Trigger sync-now/troubleshooting flows and reconcile adoption/delivery/sync dashboard counts to source events. | Admin test user, staging data access | TBD | TBD | `docs/readiness/evidence/admin-sync-dashboard-validation-template.md` | [ ] manual |

## Evidence template map

| Manual item(s) | Evidence template |
| --- | --- |
| MPW-001, MPW-005, MPW-024 | `docs/readiness/evidence/staging-nhost-verification-template.md` |
| MPW-002, MPW-024 | `docs/readiness/evidence/production-nhost-verification-template.md` |
| MPW-003, MPW-004 | `docs/readiness/evidence/hasura-permissions-review-template.md` |
| MPW-010 | `docs/readiness/evidence/role-smoke-test-template.md` |
| MPW-007 | `docs/readiness/evidence/backup-restore-drill-template.md` |
| MPW-008 | `docs/readiness/evidence/rollback-drill-template.md` |
| MPW-006, MPW-015, MPW-026 | `docs/readiness/evidence/sentry-alert-routing-template.md` |
| MPW-016 | `docs/readiness/evidence/dns-tls-verification-template.md` |
| MPW-018 | `docs/readiness/evidence/storage-bucket-permissions-template.md` |
| MPW-023 | `docs/readiness/evidence/oauth-secret-rotation-template.md` |
| MPW-011, MPW-012, MPW-014, MPW-021 | `docs/readiness/evidence/legal-privacy-ai-review-template.md` |
| MPW-027 | `docs/readiness/evidence/directory-identity-conflict-review-template.md` |
| MPW-028 | `docs/readiness/evidence/office-hours-live-verification-template.md` |
| MPW-029 | `docs/readiness/evidence/messaging-digest-retry-proof-template.md` |
| MPW-030 | `docs/readiness/evidence/assignments-sync-live-proof-template.md` |
| MPW-031 | `docs/readiness/evidence/admin-sync-dashboard-validation-template.md` |

## Launch decision matrix

| Launch decision | Blocking evidence required | Non-blocking follow-up | Decision owner placeholder |
| --- | --- | --- | --- |
| Broad production | MPW-001 through MPW-031 completed with attached evidence; browser E2E/a11y pass or signed waiver; no unreviewed high runtime audit findings; API-boundary exceptions approved. | Continued lint burn-down and bundle total-JS reduction under ratchets. | CEO / CTO / Security / Legal |
| Controlled pilot | Staging Nhost/Hasura/Sentry verified; OAuth secret rotated; role smoke, backup/restore, rollback, storage, DNS/TLS, support/on-call evidence attached; E13/E16 launch scope explicitly accepted and MPW-027/028 scoped or complete. | Production Nhost proof can follow only if pilot is staging-only. | Product + Engineering + Security |
| Internal demo/dev | Automated launch checks pass; secrets remain safe; demo uses non-production data. | Live drills and legal reviews not required for demo-only environments. | Engineering lead |

## Evidence template index

- Staging Nhost: `docs/readiness/evidence/staging-nhost-verification-template.md`
- Production Nhost: `docs/readiness/evidence/production-nhost-verification-template.md`
- Hasura permissions: `docs/readiness/evidence/hasura-permissions-review-template.md`
- Role smoke: `docs/readiness/evidence/role-smoke-test-template.md`
- Backup/restore: `docs/readiness/evidence/backup-restore-drill-template.md`
- Rollback: `docs/readiness/evidence/rollback-drill-template.md`
- Sentry/alert routing: `docs/readiness/evidence/sentry-alert-routing-template.md`
- DNS/TLS: `docs/readiness/evidence/dns-tls-verification-template.md`
- Storage permissions: `docs/readiness/evidence/storage-bucket-permissions-template.md`
- OAuth secret rotation: `docs/readiness/evidence/oauth-secret-rotation-template.md`
- Legal/privacy/AI governance: `docs/readiness/evidence/legal-privacy-ai-review-template.md`
- Directory identity conflicts: `docs/readiness/evidence/directory-identity-conflict-review-template.md`
- Office hours live verification: `docs/readiness/evidence/office-hours-live-verification-template.md`
- Messaging/digest retry proof: `docs/readiness/evidence/messaging-digest-retry-proof-template.md`
- Assignments sync proof: `docs/readiness/evidence/assignments-sync-live-proof-template.md`
- Admin sync/dashboard validation: `docs/readiness/evidence/admin-sync-dashboard-validation-template.md`
