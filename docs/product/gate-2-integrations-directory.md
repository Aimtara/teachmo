# Gate 2 — Integrations / Directory

Generated: 2026-05-05

## Status

| Item | Status | Evidence | Launch classification |
| --- | --- | --- | --- |
| E10 Directory flow | v0 repository flow exists | Directory import, preview, approval pages and Nhost function adapters exist; `SchoolDirectoryAdmin` now uses `src/domains/directory/admin.ts` instead of raw page GraphQL. | Controlled pilot requires role smoke with real data. |
| E11 Approvals + reason capture | v0 repository flow exists | Approval adapter supports approve/reject reason payloads; rejection reason remains required by UI/function path. | Live audit evidence required before broad launch. |
| E12 CSV/OneRoster-lite import | v0 dry-run/preview exists | CSV import preview and jobs support validation, `dryRun`/`previewOnly`, no-mutation preview responses, and redacted errors. | Live source import evidence required for production. |
| E13 Deterministic identity mapping | v0 implemented | `nhost/functions/_shared/directory/identityMapping.js`, `nhost/functions/sis-roster-import.js`, and Jest tests define deterministic match precedence, dry-run identity decisions, and conflict behavior. | Pilot candidate once wired into live import review UI; broad launch requires manual conflict queue evidence. |

## E13 deterministic matching rules

Automatic matches are allowed only in this precedence order:

1. exact external ID within source system and organization,
2. source system ID aliases within organization,
3. organization/school scoped email when policy allows email matching,
4. guardian/student relationship keys when policy allows relationship matching.

Name/date signals are never automatic high-confidence matches. They produce
`manual_review` candidates only. Any more than one candidate in the winning rule
bucket becomes `conflict`, not a silent merge.

Stable mapping IDs are SHA-256 hashes of organization, source system, external
ID/source ID/email/relationship values, and the candidate ID. They do not expose
raw PII.

## Remaining evidence

- Attach staging import preview showing deterministic matches, manual reviews,
  and conflicts.
- Attach approval/audit evidence for rejecting an unsafe conflict.
- Verify no raw PII appears in logs during preview/import.
- Complete `docs/readiness/evidence/directory-identity-conflict-review-template.md`
  for staging/prod import review proof.

## May 5 repository proof update

- `sis-roster-import` now accepts `dryRun`/`previewOnly` plus fixture
  `existingIdentityRecords` so staging-safe OneRoster-lite preview can prove
  exact external ID, scoped email, guardian/student relationship, duplicate, and
  manual-review conflict cases without mutating roster rows.
- Preview responses include aggregate counts, identity decisions, and conflict
  metadata only; raw row PII remains outside operational logs and is covered by
  `npm run check:pii-logging`.
