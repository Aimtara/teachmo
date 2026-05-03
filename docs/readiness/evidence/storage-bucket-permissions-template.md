# Storage Bucket Permissions Evidence Template

Status: `[ ] pending` `[ ] pass` `[ ] fail`
Environment: `staging` / `production`
Reviewer / owner:
Date:

## Buckets reviewed

| Bucket | Intended roles | Public? | Upload allowed | Download allowed | Delete allowed | Evidence link |
| --- | --- | --- | --- | --- | --- | --- |
| student/child uploads | parent, teacher, school_admin | No | Role-scoped | Role-scoped | Admin only | |
| partner assets | partner, admin | No unless explicitly public | Scoped | Scoped | Admin/owner | |
| public content | anonymous read if approved | Explicit only | Admin | Public read | Admin | |

## Required tests

- Attempt allowed upload/download with each in-scope role.
- Attempt forbidden upload/download/delete with out-of-scope roles.
- Confirm object URLs cannot bypass role policy.
- Confirm no bucket exposes raw student/child data publicly.

## Result and remediation

- Result:
- Failures:
- Remediation issue/PR:
