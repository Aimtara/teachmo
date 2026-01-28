/* eslint-env node */

// Seed data for Teachmo's internal "Single Execution Board".
// This is intentionally compact: you can update/extend it via the UI.

export const SEED_GATES = [
  {
    gate: 'G0',
    purpose: 'Foundation stable enough to build on',
    checklist: [
      { id: 'G0-1', text: 'Global error handling + basic logging', done: false },
      { id: 'G0-2', text: 'Baseline performance smoke (no obvious regressions)', done: false },
      { id: 'G0-3', text: 'Accessibility baseline for core screens', done: false },
      { id: 'G0-4', text: 'Event taxonomy exists (even partial)', done: false },
      { id: 'G0-5', text: 'Rollback strategy (feature flags / safe toggles)', done: false }
    ]
  },
  {
    gate: 'G1',
    purpose: 'Identity & tenancy v0 (passport system)',
    checklist: [
      { id: 'G1-1', text: 'Roles exist + enforced in UI & API boundaries', done: false },
      { id: 'G1-2', text: 'Tenant scoping prevents cross-school exposure', done: false },
      { id: 'G1-3', text: 'Verified guardian relationship model (v0)', done: false },
      { id: 'G1-4', text: 'Audit logging for sensitive actions', done: false },
      { id: 'G1-5', text: 'Consent surfaces exist (COPPA/FERPA aware)', done: false }
    ]
  },
  {
    gate: 'G2',
    purpose: 'Integrations/Directory v0 (truth of “who belongs where”)',
    checklist: [
      { id: 'G2-1', text: 'Directory flow: find → request → approve/deny', done: false },
      { id: 'G2-2', text: 'Roster import works (CSV/OneRoster-lite)', done: false },
      { id: 'G2-3', text: 'Identity mapping deterministic (no ghost users)', done: false },
      { id: 'G2-4', text: 'Admin sees last sync + errors + “sync now”', done: false },
      { id: 'G2-5', text: 'Runbook exists for common sync failures', done: false }
    ]
  },
  {
    gate: 'G3',
    purpose: 'Core loops v1 (messaging + scheduling + assignments)',
    checklist: [
      { id: 'G3-1', text: 'Messaging delivery SLO defined + retries', done: false },
      { id: 'G3-2', text: 'Weekly digest reliable + measurable', done: false },
      { id: 'G3-3', text: 'Office hours booking flow works end-to-end', done: false },
      { id: 'G3-4', text: 'Assignments list view works for at least one source', done: false },
      { id: 'G3-5', text: 'Permission errors near-zero on pilot flows', done: false }
    ]
  },
  {
    gate: 'G4',
    purpose: 'Analytics/Admin v1 (control room)',
    checklist: [
      { id: 'G4-1', text: 'Dashboards show adoption + delivery + sync health', done: false },
      { id: 'G4-2', text: 'Admin can troubleshoot: errors + last success + actions', done: false },
      { id: 'G4-3', text: 'Alert routing wired (warn/error pathways)', done: false },
      { id: 'G4-4', text: 'Audit tab covers all admin changes', done: false },
      { id: 'G4-5', text: 'Support playbook exists for pilot onboarding', done: false }
    ]
  }
];

export const SEED_EPICS = [
  // MVP shipping
  {
    id: 'E01',
    workstream: 'Consumer Coach core (parent-facing)',
    tag: 'MVP shipping',
    railSegment: 'Core Loops',
    ownerRole: 'Product/Eng',
    gates: ['G0', 'G3'],
    status: 'Backlog',
    dod: 'Parent can get actionable guidance, save/return to content, and complete an activity loop with tracking.',
    notes: ''
  },
  {
    id: 'E02',
    workstream: 'Messaging basics + weekly digest',
    tag: 'MVP shipping',
    railSegment: 'Core Loops',
    ownerRole: 'Eng',
    gates: ['G2', 'G3'],
    status: 'Backlog',
    dod: 'Parents/teachers can message; weekly digest sends reliably with measurable open/click metrics.',
    notes: ''
  },
  {
    id: 'E03',
    workstream: 'School directory/autocomplete',
    tag: 'MVP shipping',
    railSegment: 'Integrations/Directory',
    ownerRole: 'Eng',
    gates: ['G2'],
    status: 'Backlog',
    dod: 'User can find a school and submit a participation request with a trackable state.',
    notes: ''
  },
  {
    id: 'E04',
    workstream: 'MVP integrations (CSV roster import / thin stubs)',
    tag: 'MVP shipping',
    railSegment: 'Integrations/Directory',
    ownerRole: 'Eng',
    gates: ['G2'],
    status: 'Backlog',
    dod: 'Roster import provides deterministic user/class mappings for downstream features.',
    notes: ''
  },

  // Pilot hardening
  {
    id: 'E05',
    workstream: 'Unified Explore hub + AI handoff',
    tag: 'Pilot hardening',
    railSegment: 'Core Loops',
    ownerRole: 'Product/Design',
    gates: ['G0', 'G3'],
    status: 'Backlog',
    dod: 'Explore surfaces are unified and AI can deep-link into filtered results with consistent UX.',
    notes: ''
  },
  {
    id: 'E06',
    workstream: 'UX navigation upgrades (hierarchical nav + command patterns)',
    tag: 'Pilot hardening',
    railSegment: 'Foundation',
    ownerRole: 'Design/Eng',
    gates: ['G0'],
    status: 'Backlog',
    dod: 'Navigation is consistent across roles with fast access to frequent actions.',
    notes: ''
  },
  {
    id: 'E07',
    workstream: 'Accessibility (WCAG) + i18n baseline',
    tag: 'Pilot hardening',
    railSegment: 'Foundation',
    ownerRole: 'Eng',
    gates: ['G0'],
    status: 'Backlog',
    dod: 'Core flows pass basic WCAG checks and strings are externalized for translation.',
    notes: ''
  },
  {
    id: 'E08',
    workstream: 'Guided onboarding + tips + offline support',
    tag: 'Pilot hardening',
    railSegment: 'Core Loops',
    ownerRole: 'Product/Eng',
    gates: ['G0', 'G3'],
    status: 'Backlog',
    dod: 'Users can complete onboarding with clear next steps; core content remains usable in poor connectivity.',
    notes: ''
  },
  {
    id: 'E09',
    workstream: 'App foundation refactors (DX/perf/error handling)',
    tag: 'Pilot hardening',
    railSegment: 'Foundation',
    ownerRole: 'Eng',
    gates: ['G0'],
    status: 'In Progress',
    dod: 'Production-grade error boundaries, logging, and build hygiene; low-friction local dev.',
    notes: ''
  },
  {
    id: 'E10',
    workstream: 'Analytics instrumentation + monitoring dashboards',
    tag: 'Pilot hardening',
    railSegment: 'Analytics/Admin',
    ownerRole: 'Eng/Data',
    gates: ['G0', 'G4'],
    status: 'Backlog',
    dod: 'Key funnels + delivery/sync health are measurable with a clear event schema.',
    notes: ''
  },
  {
    id: 'E11',
    workstream: 'Pilot admin console for integrations (setup + errors + “sync now”)',
    tag: 'Pilot hardening',
    railSegment: 'Analytics/Admin',
    ownerRole: 'Eng',
    gates: ['G2', 'G4'],
    status: 'Backlog',
    dod: 'Admins can configure sync, view health, run on-demand sync, and follow troubleshooting steps.',
    notes: ''
  },
  {
    id: 'E12',
    workstream: 'Command Center / Orchestrator ops membrane',
    tag: 'Pilot hardening',
    railSegment: 'Analytics/Admin',
    ownerRole: 'Eng',
    gates: ['G4'],
    status: 'Backlog',
    dod: 'Approvals, runbooks, and escalations are UI-operable with auditability.',
    notes: ''
  },

  // Enterprise scale
  {
    id: 'E13',
    workstream: 'Auth & identity hardening (SSO, RBAC/ABAC, tenancy)',
    tag: 'Enterprise scale',
    railSegment: 'Identity',
    ownerRole: 'Eng/Security',
    gates: ['G1'],
    status: 'Backlog',
    dod: 'Roles/scopes enforced everywhere; tenant boundaries proven; SSO ready for pilots.',
    notes: ''
  },
  {
    id: 'E14',
    workstream: 'Safety, privacy, compliance (COPPA/FERPA, retention, audit)',
    tag: 'Enterprise scale',
    railSegment: 'Identity',
    ownerRole: 'Security/Legal/Eng',
    gates: ['G1'],
    status: 'Backlog',
    dod: 'Consent + retention + deletion pathways implemented; audit coverage for sensitive actions.',
    notes: ''
  },
  {
    id: 'E15',
    workstream: 'Expanded SIS/LMS/SSO integrations + provisioning',
    tag: 'Enterprise scale',
    railSegment: 'Integrations/Directory',
    ownerRole: 'Eng',
    gates: ['G2'],
    status: 'Backlog',
    dod: 'At least one SIS + one LMS connector integrated with reliable sync + mapping + admin controls.',
    notes: ''
  },
  {
    id: 'E16',
    workstream: 'Assignments sync (LMS) end-to-end',
    tag: 'Enterprise scale',
    railSegment: 'Core Loops',
    ownerRole: 'Eng',
    gates: ['G2', 'G3'],
    status: 'Backlog',
    dod: 'Parents see assignments/due dates; teachers see sync health; alerts for at-risk/late states.',
    notes: ''
  },
  {
    id: 'E17',
    workstream: 'Office Hours scheduling (teacher slots → parent booking)',
    tag: 'Enterprise scale',
    railSegment: 'Core Loops',
    ownerRole: 'Eng',
    gates: ['G3'],
    status: 'Backlog',
    dod: 'Teacher publishes slots; parent books; reminders fire; cancellations handled cleanly.',
    notes: ''
  },
  {
    id: 'E18',
    workstream: 'SafeSpace + emergency notifier + push notifications',
    tag: 'Enterprise scale',
    railSegment: 'Core Loops',
    ownerRole: 'Eng/Safety',
    gates: ['G1', 'G3'],
    status: 'Backlog',
    dod: 'Sensitive reporting + emergency comms flow exists with permissioning + auditability.',
    notes: ''
  },
  {
    id: 'E19',
    workstream: 'Directory participation flow + approvals + SLAs',
    tag: 'Enterprise scale',
    railSegment: 'Integrations/Directory',
    ownerRole: 'Eng/Product',
    gates: ['G2', 'G4'],
    status: 'Backlog',
    dod: 'Participation requests are triaged with SLA states and admin oversight.',
    notes: ''
  },
  {
    id: 'E20',
    workstream: 'Licensing / subscription management (seats, billing)',
    tag: 'Enterprise scale',
    railSegment: 'Analytics/Admin',
    ownerRole: 'Eng/Product',
    gates: ['G4'],
    status: 'Backlog',
    dod: 'Tenant has license plan, seat accounting, and admin visibility.',
    notes: ''
  },
  {
    id: 'E21',
    workstream: 'Partner portal (submissions → approval → analytics; training/incentives)',
    tag: 'Enterprise scale',
    railSegment: 'Growth',
    ownerRole: 'Eng/Product',
    gates: ['G4'],
    status: 'Backlog',
    dod: 'Partners can submit resources; admins moderate; engagement metrics visible.',
    notes: ''
  },

  // R&D
  {
    id: 'E22',
    workstream: 'Gamification enhancements (challenges/leaderboards/micro-wins)',
    tag: 'R&D',
    railSegment: 'Growth',
    ownerRole: 'Product',
    gates: ['G4'],
    status: 'Backlog',
    dod: 'Engagement mechanics improve retention without harming trust/safety.',
    notes: ''
  },
  {
    id: 'E23',
    workstream: 'Curriculum alignment (standards mapping + teacher tagging)',
    tag: 'R&D',
    railSegment: 'Growth',
    ownerRole: 'Product/Eng',
    gates: ['G4'],
    status: 'Backlog',
    dod: 'Activities can be filtered by standards/grade/subject and influence recommendations.',
    notes: ''
  },
  {
    id: 'E24',
    workstream: 'Ethical AI governance + moderation ops',
    tag: 'R&D',
    railSegment: 'Identity',
    ownerRole: 'Safety/Eng',
    gates: ['G1', 'G4'],
    status: 'Backlog',
    dod: 'AI transparency + consent + bias testing + human oversight workflows exist.',
    notes: ''
  },
  {
    id: 'E25',
    workstream: 'LTI 1.3 launch + “inside-the-LMS” access patterns',
    tag: 'R&D',
    railSegment: 'Integrations/Directory',
    ownerRole: 'Eng',
    gates: ['G2'],
    status: 'Backlog',
    dod: 'LTI launch path validated with a reference LMS and security review completed.',
    notes: ''
  }
];

export const SEED_SLICES = [
  {
    id: 'S01',
    name: 'Roster import v0 (CSV/OneRoster-lite)',
    status: 'Backlog',
    ownerRole: 'Eng',
    gate: 'G2',
    primaryEpicId: 'E04',
    summary: 'Import classes/students/guardians with deterministic mapping.',
    acceptance: 'Admin can upload CSV; system creates/updates mappings; errors actionable.'
  },
  {
    id: 'S02',
    name: 'Directory request flow v0',
    status: 'Backlog',
    ownerRole: 'Eng',
    gate: 'G2',
    primaryEpicId: 'E03',
    summary: 'Parent can request school participation; admin can approve/deny.',
    acceptance: 'State transitions tracked; audit trail for approvals.'
  },
  {
    id: 'S03',
    name: 'Messaging reliability v0 (queue/retry/metrics)',
    status: 'Backlog',
    ownerRole: 'Eng',
    gate: 'G3',
    primaryEpicId: 'E02',
    summary: 'Basic delivery SLO, retries, and visibility.',
    acceptance: 'Delivery tracked with success/failure, retry, and latency metrics.'
  },
  {
    id: 'S04',
    name: 'Permissions rail v0 (system_admin-only internal tools)',
    status: 'In Progress',
    ownerRole: 'Eng',
    gate: 'G1',
    primaryEpicId: 'E13',
    summary: 'Protect internal ops pages with scopes and internal-only routing.',
    acceptance: 'Execution Board page requires system:manage + internal routes enabled.'
  },
  {
    id: 'S05',
    name: 'Weekly digest v0 (send + open tracking)',
    status: 'Backlog',
    ownerRole: 'Eng',
    gate: 'G3',
    primaryEpicId: 'E02',
    summary: 'Digest generation + delivery + basic metrics.',
    acceptance: 'Digest sends on schedule; open/click events tracked.'
  }
];

// Dependencies are “blocks” edges: from → to.
export const SEED_DEPENDENCIES = [
  { fromKind: 'epic', fromId: 'E09', toKind: 'epic', toId: 'E13' },
  { fromKind: 'epic', fromId: 'E09', toKind: 'epic', toId: 'E10' },
  { fromKind: 'epic', fromId: 'E13', toKind: 'epic', toId: 'E04' },
  { fromKind: 'epic', fromId: 'E04', toKind: 'epic', toId: 'E02' },
  { fromKind: 'epic', fromId: 'E04', toKind: 'epic', toId: 'E16' },
  { fromKind: 'epic', fromId: 'E02', toKind: 'epic', toId: 'E10' },
  { fromKind: 'epic', fromId: 'E10', toKind: 'epic', toId: 'E12' },

  { fromKind: 'slice', fromId: 'S04', toKind: 'epic', toId: 'E12' },
  { fromKind: 'slice', fromId: 'S01', toKind: 'epic', toId: 'E02' },
  { fromKind: 'slice', fromId: 'S03', toKind: 'epic', toId: 'E10' }
];
