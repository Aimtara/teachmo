# ADR 0005 — Environment & Deployment Strategy

- **Status:** Proposed (ready to adopt)
- **Date:** 2025-12-19
- **Owners:** Product + Engineering + Ops
- **Applies to:** Frontend, backend services, Nhost/Hasura, CI/CD, pilot deployments

This ADR deliberately closes the loop between code, infra, and pilot operations—it’s designed to prevent the classic “works in staging, breaks in district demo” failure mode.

## Context

Teachmo is transitioning from prototype to pilot-ready platform. The current repo shows signs of:

- environment ambiguity (dev vs prod behavior differences)
- feature flags that can resolve unexpectedly
- partial backend setups (GraphQL + legacy services)
- lack of deterministic deploy guarantees

In K–12 pilots, deployment failures are trust failures. Teachmo needs a clear, boring, reliable environment strategy that:

- enforces parity across environments
- makes releases predictable
- supports compliance and debugging
- allows pilots to proceed without “hero ops”

## Decision Summary

Teachmo adopts a three-environment model with strict separation, deterministic configuration, and CI-enforced correctness:

- Local Development (local)
- Shared Staging / Pilot (staging)
- Production (production)

Each environment has:

- its own backend (Nhost project)
- its own database
- its own secrets
- explicit, documented feature flags

No environment shares state with another.

## Environment Definitions

### 1) Local Development (local)

Purpose: Fast iteration, safe experimentation, onboarding new devs.

Characteristics:

- Local frontend (vite dev)
- Backend via:
  - Nhost dev project or
  - local Nhost emulator (preferred when feasible)
- Mock or sandbox integrations (SIS/LMS/SSO)
- Debug logging enabled
- Seed data available

Rules:

- No real PII.
- No real school/district data.
- No production credentials.

Required capabilities:

- .env.local file
- seed script to populate:
  - org
  - school
  - test users (parent/teacher/admin)
  - sample children and enrollments

### 2) Staging / Pilot (staging)

Purpose: District pilots, QA, demos, UAT, compliance validation.

Characteristics:

- Deployed frontend (Vercel/Netlify/etc.)
- Dedicated staging Nhost project
- Real auth flows (email/SMS/SSO where applicable)
- Limited real user data (pilot-only)
- Full observability enabled
- Feature flags may differ from prod (explicitly)

Rules:

- No experimental schema changes without migration.
- No “temporary hacks.”
- All changes must be reversible.
- Staging ≠ playground.

Required capabilities:

- Full RBAC/ABAC enforcement
- Audit logging ON
- Retention jobs running
- Moderation pipeline active (even if light)
- Clear banner: “Pilot / Staging Environment”

### 3) Production (production)

Purpose: Live deployments for schools and families.

Characteristics:

- Locked-down infra
- Hardened feature set
- Production secrets only
- Strict retention + compliance enforcement
- Minimal debug logging
- Rate limiting enabled

Rules:

- No direct DB access.
- No force pushes.
- Schema changes require migration + review.
- Emergency access requires break-glass process (logged).

## Backend Strategy (Nhost + Hasura)

### Nhost Projects

Teachmo uses one Nhost project per environment:

- teachmo-local (optional)
- teachmo-staging
- teachmo-prod

Each project includes:

- Postgres DB
- Hasura metadata
- Auth configuration
- Storage buckets
- Scheduled jobs

### Schema & Metadata Management

Database schema and Hasura metadata are source-controlled. Migrations are applied in order via CI or scripted deploy. Metadata is treated as code, not console state.

Rules:

- No manual production metadata edits
- hasura metadata export is part of the release process
- Drift between environments is considered a bug

## Frontend Deployment Strategy

### Build-time configuration

Frontend builds are environment-specific:

- .env.local
- .env.staging
- .env.production

Only VITE_* variables are exposed to the client.

Allowed environment variables (examples)

- VITE_APP_ENV=local|staging|production
- VITE_NHOST_BACKEND_URL
- VITE_USE_GRAPHQL_MESSAGES=true|false
- VITE_ANALYTICS_ENABLED=true|false
- VITE_SENTRY_DSN (empty in local)

Rule:  
Environment flags must be parsed via a deterministic helper (envFlag()).

### Feature Flag Policy

Feature flags are:

- environment-scoped
- explicit
- documented

Flags are allowed only for:

- backend migration bridges
- staged feature rollouts
- pilot-only features

Flags are not allowed for:

- core security logic
- permission enforcement
- data retention rules

All flags must be listed in:

- .env.example
- docs/feature-flags.md

## CI/CD Requirements

### Required checks before merge to main

- Typecheck / lint pass
- Build succeeds for staging
- Hasura metadata validation (no missing tracked tables)
- Migration scripts apply cleanly

### Deployment flow (recommended)

- Merge to main
- Deploy to staging
- Run smoke tests:
  - login
  - onboarding
  - messaging
  - explore navigation
- Manual approval gate
- Promote to production

No direct deploys to production from feature branches.

## Secrets Management

Secrets are:

- Never committed to repo
- Scoped per environment
- Rotatable without redeploying frontend

Examples:

- Nhost admin secrets
- SSO client secrets
- API keys for AI providers
- Webhook secrets

Preferred storage:

- Nhost secrets manager
- Hosting provider env vars
- Encrypted vault (if introduced later)

## Observability & Monitoring

Enabled per environment:

- Local: console logs only
- Staging: full logging + error tracking
- Production: error tracking, metrics, alerts

Minimum required signals:

- auth failures
- permission denials
- message send failures
- moderation actions
- retention job execution

Alerts:

- staging: informational
- production: actionable (on-call)

## Rollback Strategy

Every deployment must be:

- versioned
- reversible

Rollback mechanisms:

- frontend: redeploy previous build
- backend schema: down migrations or forward-fix migrations
- feature flags: disable without redeploy

Production rollback should not require database surgery.

## Compliance & Incident Readiness

For staging and production:

- audit logs enabled
- retention jobs running
- moderation queue accessible
- ability to:
  - freeze user account
  - freeze org/school
  - place legal hold on data

Incident response steps must be documented and rehearsed at least once per pilot.

## Consequences

- Slightly higher upfront setup cost
- Much lower pilot risk
- Predictable demos and QA
- Faster onboarding of new engineers
- Easier compliance conversations with districts

## Follow-ups / Implementation Tasks

- Create docs/environments.md
- Add .env.example with comments
- Implement envFlag() helper and replace existing usages
- Add Hasura metadata export/import scripts
- Set up staging Nhost project with pilot-safe data
- Add environment banner component (local, staging)
- Document rollback runbook

## Decision Summary

- Three environments, strictly separated
- One backend per environment
- Metadata and schema are code
- Deterministic flags only
- CI-enforced deploy safety
- Rollbacks are first-class
