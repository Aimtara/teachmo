# ADR 0002 — Tenancy Model + RBAC/ABAC Authorization Rules

- **Status:** Proposed (ready to adopt)
- **Date:** 2025-12-19
- **Owners:** Product + Engineering
- **Applies to:** Nhost/Hasura schema + permissions + app routing

## Context

Teachmo must support multiple schools/districts and multiple roles (parent/teacher/admin/partner). K–12 scenarios require hard data boundaries:

- parents should only see their own child(ren) + relevant school content
- teachers should only see students/parents in their roster(s)
- admins need broad visibility in their school/district
- partners must be isolated from student data

A consistent tenancy model is required across:

- database schema
- Hasura permissions
- UI routing + feature gating

## Decision

Teachmo adopts a hierarchical tenancy model with RBAC (roles) + attribute scoping (ABAC-ish).

### Tenancy hierarchy

**Organization (Org)**  
Represents district/system, charter network, or operator.

**School**  
Belongs to an Org.

**Classroom / Section (optional for Phase 1, required for school messaging/rosters)**  
Belongs to a School (and implicitly Org).

**User**  
Belongs to an Org; may be affiliated with one or more Schools; may be linked to children.

### Canonical entities (conceptual)

- organizations(id, name, type, …)
- schools(id, org_id, name, …)
- profiles(user_id, org_id, role, …) (or users + profiles)
- school_memberships(user_id, school_id, role_at_school, status)
- classrooms(id, school_id, name, …)
- classroom_memberships(user_id, classroom_id, role_in_classroom)
- children(id, org_id, …) (child profiles)
- guardian_links(parent_user_id, child_id, status, verified_at, method, …)
- student_enrollments(child_id, classroom_id, status, …)

### Authorization model

#### Roles (RBAC)

Teachmo supports these global roles (stored in profiles.role):

- parent
- teacher
- school_admin
- district_admin
- partner
- student (optional; Phase 2)
- super_admin (internal)

#### Attribute scoping (ABAC-ish rules)

Access is governed by:

- org_id match (tenant boundary)
- school_id membership (within tenant)
- classroom_id membership (teacher roster boundary)
- guardian_links (parent-child boundary)
- status fields (active, pending, revoked, unverified)

### Enforcement hierarchy

- Hasura permissions are authoritative (row + column-level).
- UI route guards are convenience only (never relied on for security).

### Core permission rules (minimum viable)

**Parent**

May:

- read their own profile
- read children where they have an active verified guardian_link
- read classroom/school announcements tied to their child’s enrollments
- message teachers/staff only if linked via child enrollment context

May not:

- browse other students/parents
- access admin/partner modules
- access partner submissions

**Teacher**

May:

- read children and guardian contact fields only for their classroom rosters (active enrollments)
- message parents of rostered students
- create/update classroom posts/assignments (if in scope)

May not:

- view students not in roster
- view district-wide analytics (unless dual role)

**School Admin**

May:

- read/write all entities within their school_id (except partner-only billing/contracts)
- manage school memberships, approve parent links (or delegate)
- view audit logs for the school

May not:

- access district-wide data unless district_admin

**District Admin**

May:

- manage multiple schools within org_id
- view org-wide analytics + audit logs
- set policy defaults (retention, languages, moderation thresholds)

**Partner**

May:

- access only partner-portal tables: submissions/resources/offers/events metadata
- never access child data, messaging content, or guardian links
- see only aggregated analytics relevant to partner contributions (no PII)

**Super Admin**

Internal break-glass role:

- access across tenants with explicit audit logging and just-in-time elevation.

## Consequences

- Requires clear schema relationships (org/school/classroom).
- Requires consistent use of org_id in every tenant-scoped table.
- Requires Hasura permission definitions for each role.

## Follow-ups / Implementation tasks

- Add a tenant_scoped checklist: every table must have org_id or a resolvable path to it.
- Implement Hasura permission sets per role using:
  - session vars (x-hasura-user-id, x-hasura-role, x-hasura-org-id)
- Add status state machines for:
  - school_memberships
  - guardian_links
- Add a “switch school” control for multi-school users (admins, district).
