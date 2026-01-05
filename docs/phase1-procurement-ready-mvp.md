# Phase 1 — Procurement-Ready MVP

**Goal:** Pass district IT/security review and pilot approval.

**Timeline:** ~6–8 weeks

**Outcome:** Signed pilots, not “interesting conversations.”

## Phase 1 Acceptance Bar
A district IT admin can answer **“yes”** to:

- Can we control access centrally?
- Can we audit everything?
- Can we turn features off?
- Can we export our data?
- Is this legally defensible?

## Must-have Epics

### 1) Identity, Access & Tenant Security (Foundational)
**Purpose:** Ensure only the right people can access the right data, automatically, at scale.

**Scope**
- SSO (SAML/OIDC)
- SCIM provisioning
- Granular RBAC
- Tenant isolation

**Acceptance Criteria**
- Admins can configure SSO via Okta, Azure AD, or Google Workspace.
- Users can only access data belonging to their tenant (org/district/school).
- SCIM supports:
  - Create user
  - Deactivate user
  - Role updates
- Role permissions are enforced both:
  - In UI (navigation + visibility)
  - In backend (API authorization)
- Support impersonation exists with full audit logging.
- Automated tests verify cross-tenant access is impossible.

### 2) Audit Logging, Compliance & Data Governance
**Purpose:** Make Teachmo defensible during audits, incidents, and procurement reviews.

**Scope**
- Audit logs
- Data retention
- DSAR / COPPA / FERPA enforcement

**Acceptance Criteria**
- Every sensitive action is logged with:
  - Actor
  - Timestamp
  - Action
  - Object
  - Before/after state
- Logs are:
  - Immutable
  - Exportable (CSV)
  - Filterable by tenant/user/action/date
- Data retention policies configurable per tenant.
- Admins can:
  - Export all data for a user
  - Permanently delete user data
- AI data usage respects privacy rules automatically.
- Compliance documentation is surfaced in admin UI.

### 3) Observability, Reliability & Incident Readiness
**Purpose:** Know what’s broken, before customers do.

**Scope**
- Logging
- Metrics
- Alerts
- System health UI

**Acceptance Criteria**
- Centralized logs for:
  - API
  - Background jobs
  - AI calls
  - Integrations
- Metrics dashboards exist for:
  - API latency
  - Notification delivery
  - AI cost usage
  - Error rates
- Alerting triggers on:
  - Error spikes
  - Queue backlogs
  - Integration failures
- Admins can view system health inside Teachmo.
- Backup & restore tested and documented.

### 4) Enterprise Integrations (SIS / LMS / Identity)
**Purpose:** Fit into existing school infrastructure without manual work.

**Scope**
- SIS sync
- LMS/LTI
- IAM governance

**Acceptance Criteria**
- SIS sync supports:
  - Roster import
  - Role assignment
  - Scheduled refresh
- Sync failures surface in admin UI with remediation steps.
- LMS/LTI integration launches Teachmo contextually.
- IAM rules determine what AI and exports can access.
- All integrations are tenant-scoped and revocable.

### 5) Scalable Notifications & Communication
**Purpose:** Reach thousands of families without chaos or spam.

**Scope**
- Email, SMS, push
- Preferences
- Scheduling
- Deliverability

**Acceptance Criteria**
- Notification preferences configurable per user and role.
- Admins can send:
  - Tenant-wide announcements
  - Segmented messages
- Scheduled delivery supported.
- Email domain authenticated (SPF/DKIM/DMARC).
- SMS opt-in/out enforced automatically.
- Delivery metrics visible in admin analytics.
- Notifications are accessible (screen reader + keyboard).

### 6) AI Governance, Explainability & Cost Control
**Purpose:** Make AI safe, auditable, explainable, and affordable.

**Scope**
- AI logs
- Human-in-the-loop
- Prompt management
- Cost controls

**Acceptance Criteria**
- Every AI call logs:
  - Model
  - Prompt
  - Inputs
  - Outputs
  - Reviewer actions (if any)
- Admins can review and approve AI content before release.
- AI Transparency Center exists with:
  - Model descriptions
  - Data usage explanation
  - Ethical guidelines
- Dynamic model selection based on cost/complexity.
- Per-tenant AI budgets and alerts.
- AI features are feature-flagged per tenant.

### 7) Partner & Enterprise Marketplace Readiness
**Purpose:** Enable external partners without operational overhead.

**Scope**
- Partner onboarding
- Incentives
- Billing & payouts
- Analytics

**Acceptance Criteria**
- Partners can:
  - Self-apply
  - Onboard after approval
  - Manage offers and discounts
- Admins can:
  - Approve/deactivate partners
  - Export leads and referral codes
- CSV exports available.
- Analytics show:
  - Partner usage
  - Conversion
  - Revenue attribution
- Fraud and abuse protections exist.

### 8) Accessibility & Internationalization Compliance
**Purpose:** Meet legal and ethical requirements for inclusive access.

**Scope**
- WCAG compliance
- Keyboard navigation
- i18n rollout

**Acceptance Criteria**
- All interactive elements keyboard-accessible.
- Screen reader labels verified.
- Color contrast meets WCAG AA.
- `jest-axe` runs in CI.
- Playwright covers keyboard flows.
- Language switching persists per user.
- i18n rollout gated by feature flags.

### 9) Quality, Testing & Release Discipline
**Purpose:** Ship safely without regressions.

**Scope**
- Unit tests
- E2E tests
- Feature flags
- Rollbacks

**Acceptance Criteria**
- Jest passes for core components and services.
- Playwright covers:
  - Parent
  - Teacher
  - Admin
  - Calendar
- Feature flags control all major releases.
- Canary/staged rollout supported.
- Rollback plan documented and tested.

### 10) Enterprise Support, Onboarding & Trust
**Purpose:** Make districts feel supported, not abandoned.

**Scope**
- Admin onboarding
- Help desk
- Documentation

**Acceptance Criteria**
- Enterprise onboarding checklist exists.
- Admin walkthrough UI implemented.
- Knowledge base available.
- Support escalation flow documented.
- SLA targets defined and visible.
