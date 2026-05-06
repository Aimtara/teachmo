# Access control model

Teachmo access must fail closed for child, student, guardian, school, roster, messaging, AI, export, and deletion data.

## Relationship states

Guardian/student relationships use:

- `unverified`
- `invited`
- `school_verified`
- `guardian_confirmed`
- `revoked`
- `disputed`

Only `school_verified` and `guardian_confirmed` authorize guardian access.

## Server-side policy helpers

`backend/compliance/accessControl.js` provides:

- `canAccessStudentData(actor, student, context)`
- `requireVerifiedGuardianRelationship(actorId, studentId, context)`
- `requireSchoolAuthorizedRelationship(actorId, studentId, schoolId, context)`
- `requireRole(actor, allowedRoles)`
- `requireTenant(actor, tenantId)`
- `requireSchoolScope(actor, schoolId)`
- `requireClassScope(actor, classId)`
- `requireStudentScope(actor, student, context)`
- `requireAdminScope(actor, action, context)`

## Rules

- Guardians require verified relationship and tenant match.
- Teachers require tenant, school, and assigned class match.
- School admins require tenant and school match.
- District admins require tenant match.
- Cross-tenant access is denied before role-specific checks.

## Route integration expectation

UI guards are advisory. Every Express route, Hasura permission, Nhost function, export, deletion, AI insight, messaging, and admin API that touches student data must call a server-side policy helper or enforce equivalent Hasura row permissions.
