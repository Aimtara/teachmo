# Hasura Permission Smoke Runbook

Use this runbook to prove that Hasura permissions are actually enforced in staging/production. Repository checks only prove that artifacts and workflows exist; they do not prove live metadata is applied.

## Automated command

```bash
REQUIRE_HASURA_SMOKE=true \
HASURA_GRAPHQL_ENDPOINT=https://<project>.hasura.<region>.nhost.run/v1/graphql \
TEST_JWT_TEACHER=<teacher-role-jwt> \
TEST_JWT_DISTRICT_ADMIN=<district-admin-role-jwt> \
npm run smoke:hasura-permissions
```

Expected result: command exits `0` only after real allowed/denied GraphQL checks run. Missing secrets or test JWTs must exit non-zero for protected environments.

## Protected-context policy

- `main`, release branches, scheduled runs, staging deploys, production deploys, and manual launch-gate runs must fail closed if required secrets are absent.
- Pull requests from forks may skip live permission smoke only because secrets are unavailable to untrusted code. The workflow must print that this is a non-protected skip.

## Evidence required

- Workflow URL or terminal output showing real GraphQL checks ran.
- Endpoint/project ID, with secrets redacted.
- Test user IDs and roles, with PII redacted.
- Allowed/denied result summary.
- Reviewer signoff.

## Role matrix to verify manually

| Role | Allowed reads | Forbidden reads | Allowed writes | Forbidden writes | Tenant/child-data boundary | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| anonymous | Public marketing/config only if explicitly enabled | profiles, children/students, messages, schools/classes, audit logs | none | all core data writes | no tenant data visible | denied GraphQL screenshots/logs |
| authenticated user | own profile/session shell | other users, child/student records without relationship, audit logs | own profile fields allowed by policy | role changes, tenant changes, messages outside threads | user ID scoped | own vs other-user query evidence |
| parent/guardian | own profile, linked children, own message threads, own events | unlinked children, other families, school-wide private data | messages in participant threads, allowed guardian updates | teacher/admin-only fields, cross-tenant messages | guardian-child join enforced | allowed own child + denied other child |
| teacher | own classes/classrooms, assigned students as permitted, thread messages | other teachers' classes, unrelated children, audit logs | classroom/event/assignment updates in scope | cross-school/class writes, admin settings | classroom/school scope enforced | allowed own class + denied other class |
| partner | own submissions/status and partner-facing config | parent/child/student/message private data, other partners' submissions | own partner submissions | payout/admin/fraud/system updates | partner ID scoped | own vs other partner evidence |
| admin | tenant/school scoped admin data | other tenants unless system_admin | tenant-scoped role/settings changes | system-level break-glass without role | tenant scope claim enforced | scoped admin evidence |
| ops/system_admin | operational dashboards, audit exports per policy | raw child/message PII unless explicitly approved | audited operational actions | unaudited changes | every sensitive access audited | audit event for access/action |

## Failure handling

Any unexpected allow, missing deny, missing audit event, or metadata drift is a launch blocker until fixed or formally waived by security/product leadership with documented residual risk.
