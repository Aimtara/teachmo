# Hasura RBAC Live Verification Evidence

## Scope

- Environment:
- Hasura project/metadata version:
- Executor / reviewer:

## Role matrix

| Role | Query/action | Expected | Actual | Pass/fail | Artifact |
| --- | --- | --- | --- | --- | --- |
| parent | Student/child-scoped read | Allow only own tenant/scope | TBD | TBD | TBD |
| teacher | Class/student read | Allow assigned classes only | TBD | TBD | TBD |
| partner | Partner submissions | Tenant/partner scoped | TBD | TBD | TBD |
| school_admin | Directory/admin flows | School scoped | TBD | TBD | TBD |
| district_admin | District flows | District scoped | TBD | TBD | TBD |
| system_admin | Ops/admin flows | Allowed with audit | TBD | TBD | TBD |

## Required attachments

- Exported live metadata diff against repo.
- Role-token smoke command output.
- Denial evidence for cross-tenant and non-admin access.
- Reviewer signoff.
