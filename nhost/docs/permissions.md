# Permissions starter recipes

> Production readiness note: Nhost/Hasura remains the authoritative enforcement layer for
> tenant isolation and RBAC. UI route guards are convenience only. Before any staging or
> production launch, run `npm run check:hasura-readiness`, export/apply metadata with the
> Nhost/Hasura CLI, and complete the live permission review in
> `docs/runbooks/hasura-production-readiness.md`.

## Manual role matrix

Before staging/prod launch, execute and attach evidence for each role below. Evidence must include the role token/user, query or mutation name, expected allow/deny result, actual result, and tenant/school IDs used.

| Role | Allowed reads | Forbidden reads | Allowed writes | Forbidden writes | Isolation/audit evidence |
| --- | --- | --- | --- | --- | --- |
| anonymous | Public unauthenticated landing/auth metadata only, if explicitly enabled | Profiles, children/students, messages, classrooms, partner submissions, audit log | None unless a documented public intake form exists | Any child/student, message, role, tenant, or audit writes | Denied GraphQL response for private tables. |
| authenticated user | Own `profiles` row and allowed onboarding state | Other users' profiles, children, messages, tenant admin data | Own onboarding/profile updates only | Role changes, tenant changes, child links without permission | JWT `x-hasura-user-id` scopes own rows only. |
| parent/guardian | Own profile, linked children through `guardian_children`, own/participating message threads | Unlinked child/student records, other guardians' messages, school/admin data | Parent-owned profile fields, messages in participant threads | Cross-thread messages, child links without approved workflow | Cross-child and cross-thread denied evidence. |
| teacher | Own profile, assigned classrooms/students/events, participant threads | Other schools/classes, parent-only/private data, audit log | Classroom events/assignments/messages within scope | Cross-school classroom/student changes, role changes | Same-school allowed and cross-school denied evidence. |
| partner | Own partner submissions/status and allowed integration metadata | Student/child PII, school-wide rosters, other partner submissions | Own submissions/updates through partner workflow | Direct student/message/audit writes | Partner tenant submission isolation evidence. |
| admin | Scoped org/school/district management data by admin scope | Out-of-scope tenant/district records unless system admin | Scoped provisioning, role assignment, school/classroom updates | Cross-tenant changes outside assigned scope | In-scope allowed, out-of-scope denied, audit insert observed. |
| ops/system_admin | Operational/admin tables required for support and incident response | Raw secrets and vendor payloads through Hasura public roles | Break-glass/admin actions only through approved workflows | Unapproved direct PII export/delete outside SOP | Audit log visibility and break-glass evidence. |

## Parents
- Select and update their own `profiles` row.
- Select `children` where `profile_id = X-Hasura-User-Id` or joined via `guardian_children`.
- Select and insert `message_threads` when they are listed in `thread_participants`.
- Select/insert `messages` only for threads they participate in.

## Teachers
- Manage `classrooms` where `teacher_id = X-Hasura-User-Id`.
- Select/insert/update `events` created by them or tied to their classrooms.
- Send and view messages in threads where they are a participant.

## Partners
- Insert and update `partner_submissions` where `partner_id = X-Hasura-User-Id`.
- Select their own submissions for status tracking.

## Admins
- Full access to all tables for system administrators.
- District and school admins can manage `schools`, `classrooms`, and related `profiles` within their scope.

## Notes
- Apply column presets for `profiles.user_id` and `partner_submissions.partner_id` using `X-Hasura-User-Id`.
- Ensure `updated_at` triggers remain enabled after migrations.
- Verify every role against real staging users: unauthenticated, parent, teacher, school admin,
  district admin, partner, and system admin.
- Capture evidence for permission-denied behavior on cross-school/cross-district records.
