# SCIM Provisioning (v2)

Teachmo exposes SCIM 2.0 endpoints for tenant-scoped user and group provisioning. These endpoints are owned by the
legacy Express API and enforce tenant isolation via auth claims.

## Base URL

```
/scim/v2
```

## Authentication & Tenant Scoping

* **Auth:** Bearer JWT required.
* **Tenant scope:** organization + optional school IDs must be present in verified claims.
* **Permissions:** one of `directory:manage`, `users:manage`, or `tenant:manage`.

## Users

### Create (idempotent)

`POST /scim/v2/Users`

* Idempotent on `externalId` (preferred) or `userName` (email).
* `active: false` deactivates the user (sets auth disabled).
* `groups` values are mapped to roles when they match known role names.

### Update

`PUT /scim/v2/Users/:id`

Updates profile fields, activation status, and group memberships.

### Deactivate

`PATCH /scim/v2/Users/:id`

Supports SCIM Patch with `path: "active"` or a direct `active` boolean.

## Groups

### Create (idempotent)

`POST /scim/v2/Groups`

Idempotent on `externalId` or `displayName`. Optionally accepts `members`.

### Update

`PUT /scim/v2/Groups/:id`

Replaces display name and membership list.

## Data Mapping

* **userName** → `auth.users.email`
* **displayName/name.formatted** → `public.user_profiles.full_name`
* **active** → `auth.users.disabled` (inverted)
* **groups** → `public.scim_group_members` + role assignment in `public.user_profiles.role`

## Auditability

Administrative impersonation events are written to `public.audit_log` with `impersonation.start` and
`impersonation.end` actions.
