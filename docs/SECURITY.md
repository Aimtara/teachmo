# Security Policy

## Reporting a vulnerability

If you believe you have found a security issue in Teachmo, please report it privately.

- Email: security@teachmo.com
- Include: a description of the issue, steps to reproduce, impacted endpoints or pages, and any proof-of-concept artifacts.

We will acknowledge reports within 2 business days and provide a remediation timeline once we validate the issue.

## Security controls

Teachmo applies layered controls to protect user data and tenant boundaries:

- **Authentication & authorization**: Nhost authentication with Hasura role-based access control (RBAC).
- **Tenant isolation**: organization- and school-scoped claims used in Hasura permissions and backend APIs.
- **Audit logging**: append-only audit logs for security-sensitive actions.
- **Secrets management**: environment variables and managed secrets for keys and admin access.
- **Least privilege**: role-scoped permissions for teachers, parents, partners, and administrators.

## Data protection

- **Encryption**: TLS in transit and database-level protections at rest.
- **PII handling**: restricted to authorized roles and scoped to tenant boundaries.
- **Incident response**: internal runbooks for detection, triage, and customer communication.

## Supported versions

Teachmo maintains security fixes on the latest production release. Please upgrade to the newest version when patches are published.
