# Teachmo Security Overview

## Tenant Isolation Model
Teachmo enforces tenant isolation across the application stack:

- **Hasura session variables** determine district and school scope.
- **Row-level filtering** (Hasura permissions) ensures data is scoped by `district_id` or `school_id`.
- **Immutable audit logs** provide an append-only record of security-sensitive activity.

## SSO Setup (Google Workspace & Azure AD)
1. Enable Google Workspace or Azure AD in the Nhost dashboard.
2. Configure the tenant policy in **Admin → SSO Policy**.
3. Set allowed domains and enforcement mode before rollout.

## Role-Based Access Matrix
| Role | Scope | Example Capabilities |
| --- | --- | --- |
| `system_admin` | Global | Platform configuration, incident response, full audit access |
| `district_admin` | District | Tenant settings, feature flags, audit exports |
| `school_admin` | School | School-scoped governance, SIS roster review |
| `teacher` / `parent` | Self | Access to their own data only |

## Audit Log Immutability
Audit logs are append-only. Updates and deletes are blocked at the database layer to prevent tampering.

To export audit logs:
1. Navigate to **Admin → Audit Logs**.
2. Apply optional filters.
3. Click **Export CSV**.

## Data Retention & Deletion
- **Retention** defaults to district policy. Records can be archived after the configured duration.
- **Deletion** requests are processed with tenant admin approval and logged in the audit trail.

## Encryption & Token Rotation
- **In transit**: TLS for all traffic.
- **At rest**: Postgres-managed encryption.
- **Token rotation**: Access tokens are short-lived, refresh tokens are rotated per Nhost settings.

## Incident Response
1. Detect incident via monitoring or audit log alerts.
2. Contain and rotate credentials.
3. Notify affected tenants with an impact summary.
4. Perform post-incident review and remediation steps.
