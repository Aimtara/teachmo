# Teachmo Enterprise Security Overview

Teachmo takes the security of your educational data seriously. Our enterprise
edition implements multiple layers of protection to safeguard sensitive
information and to comply with FERPA and other privacy regulations.

## Identity & Access Management

* **Single Sign-On (SSO)**: Support for Google and Azure Active Directory
  enables your organization to enforce strong authentication and centralized
  account policies. Optional providers like GitHub and Facebook may be enabled
  on request for special use cases.
* **Role-Based Access Control (RBAC)**: Every user is assigned an `app_role`
  (parent, teacher, school_admin, district_admin, system_admin, partner, etc.)
  and scopes that define what features they may access. Administrators can
  manage roles and scopes through the Admin users page.
* **Tenant Domains**: District administrators can add and verify email
  domains to ensure that only users with approved domains can sign in.

## Data Protection

* **Encryption in Transit and at Rest**: All traffic between clients and the
  Teachmo platform is encrypted via TLS. Data stored in our databases is
  encrypted at rest using industry-standard AES-256 encryption.
* **Column-Level Permissions**: Hasura metadata is configured to restrict
  column access based on the user's role and tenant. Audit triggers ensure
  changes are logged.

## Auditing & Compliance

* **Immutable Audit Logs**: Key events such as user sign-ins, domain changes,
  SSO configuration updates and AI review actions are recorded in an immutable
  audit log. Administrators can export these logs as CSV files for external
  review.
* **Human-in-the-Loop**: AI systems are subject to human oversight via the
  AI Review Queue. District admins must approve or reject flagged AI responses
  before they are surfaced to end users.
* **Transparency**: Teachmo publishes a public AI transparency page and
  provides tenant administrators with governance dashboards to understand how
  AI models are used within their organization.

For more details on how Teachmo handles data privacy and security, please
contact our security team at <security@teachmo.com>.
