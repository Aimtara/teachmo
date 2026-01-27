/* eslint-env node */

/**
 * Seed data for the Teachmo Single Execution Board.
 *
 * Compact representation: tuples -> objects.
 */

const mkChecklist = (items = []) => items.map((text, i) => ({ id: `c${i + 1}`, text, done: false }));

const GATES = [
  ['G0', 'Foundation stable enough to build on', [
    'Global error handling + logging',
    'Basic performance guardrails (no obvious regressions)',
    'Accessibility baseline pass on core screens',
    'Analytics event schema defined'
  ], 'Foundation & Quality'],
  ['G1', 'Identity & tenancy v0', [
    'Core roles enforced (parent/teacher/admin/partner)',
    'Tenant scoping prevents cross-org data exposure',
    'Audit log exists for sensitive actions'
  ], 'Identity & Compliance'],
  ['G2', 'Integrations & directory v0', [
    'Directory request/approve flow works end-to-end',
    'Roster import works (CSV/OneRoster-lite)',
    'Identity mapping rules deterministic'
  ], 'Integrations'],
  ['G3', 'Core loops v1 (messaging/scheduling/assignments)', [
    'Messaging delivery SLO + retry behavior defined',
    'Weekly digest reliable + measurable',
    'Office hours booking works (minimal)',
    'Assignments: at least one source working or contract-stubbed'
  ], 'Core Loops'],
  ['G4', 'Analytics + admin console v1', [
    'Dashboards show adoption + delivery + sync health',
    'Admin can: sync now, see errors, see last successful sync',
    'Basic troubleshooting runbooks documented'
  ], 'Admin/Analytics']
];

const EPICS = [
  ['E01', 'Consumer Coach core', 'MVP shipping', 'Core Loops', 'G0,G3', 'E09', 'E04', 'Parent coach loop usable end-to-end'],
  ['E02', 'Messaging basics + weekly digest', 'MVP shipping', 'Core Loops', 'G2,G3', 'E03,E09', 'E10', 'Messages deliver + digest runs reliably'],
  ['E03', 'School directory/autocomplete', 'MVP shipping', 'Integrations', 'G2', 'E13', 'E02', 'Directory search + request flow works'],
  ['E04', 'Unified Explore + AI handoff', 'Pilot hardening', 'Core Loops', 'G0,G3', 'E01,E14', 'E22', 'AI deep-links into Explore results'],
  ['E05', 'Office hours scheduling', 'Enterprise scale', 'Core Loops', 'G1,G3', 'E13,E02', 'E20', 'Book/cancel + reminders + audit'],
  ['E06', 'Assignments sync (LMS)', 'Enterprise scale', 'Integrations', 'G1,G2,G3', 'E13,E15', 'E10', 'Assignments list + due dates from 1 source'],
  ['E07', 'SafeSpace + emergency notifier', 'Enterprise scale', 'Identity & Compliance', 'G1,G3', 'E13,E14', 'E10', 'Sensitive reporting with permissions + audit'],
  ['E08', 'Partner ecosystem + submissions', 'Enterprise scale', 'Growth', 'G1,G4', 'E13', 'E21', 'Partner submit→moderate→publish'],
  ['E09', 'UX + app foundation upgrades', 'Pilot hardening', 'Foundation', 'G0', '', 'E01,E02,E04', 'Error handling + perf + DX baseline'],
  ['E10', 'Analytics & observability', 'Pilot hardening', 'Admin/Analytics', 'G0,G4', 'E02,E15', 'E12', 'Dashboards + alerts for core flows'],
  ['E11', 'Pilot admin console for integrations', 'Pilot hardening', 'Admin/Analytics', 'G2,G4', 'E15', 'E16', 'Setup + sync now + errors visible'],
  ['E12', 'Orchestrator/Command Center ops', 'Pilot hardening', 'Admin/Analytics', 'G0,G4', 'E10', 'E19', 'Approvals/runbooks/escalations/rollbacks in UI'],
  ['E13', 'Auth/Identity hardening (SSO,RBAC,tenancy)', 'Enterprise scale', 'Identity & Compliance', 'G1', 'E09', 'E15,E20', 'Tenant + RBAC/ABAC + verified guardianship'],
  ['E14', 'Safety/privacy/compliance (COPPA/FERPA/audit)', 'Enterprise scale', 'Identity & Compliance', 'G1', 'E13', 'E07', 'Consent + retention + immutable audit'],
  ['E15', 'External integrations (SIS/LMS/SSO) expanded', 'Enterprise scale', 'Integrations', 'G2', 'E13', 'E06,E11', 'Provisioning + sync jobs + mapping'],
  ['E16', 'School participation request flow', 'Enterprise scale', 'Integrations', 'G2', 'E03', 'E20', 'Approve/deny participation + SLA'],
  ['E17', 'Licensing/subscription management', 'Enterprise scale', 'Growth', 'G1,G4', 'E13', 'E23', 'Seat tracking + billing hooks'],
  ['E18', 'Partner portal (admin + analytics + training)', 'Enterprise scale', 'Growth', 'G4', 'E08,E13', 'E23', 'Partner dashboards + incentives'],
  ['E19', 'Execution board system (this tool)', 'Pilot hardening', 'Admin/Analytics', 'G0', 'E09', 'E12', 'Operational board in-app, persisted'],
  ['E20', 'Admin config surfaces (integrations/permissions)', 'Enterprise scale', 'Admin/Analytics', 'G4', 'E13,E15', 'E23', 'Admin can configure + troubleshoot'],
  ['E21', 'Content moderation & governance workflows', 'Enterprise scale', 'Identity & Compliance', 'G1,G4', 'E14', 'E23', 'Review queues + actions audited'],
  ['E22', 'Gamification & engagement mechanics', 'R&D', 'Growth', '', 'E10', '', 'Challenges/leaderboards/micro-wins validated'],
  ['E23', 'GTM/decision stream (pricing/pilots/data retention)', 'R&D', 'Growth', '', 'E13', '', 'Key strategic decisions captured + executed'],
  ['E24', 'Curriculum alignment', 'R&D', 'Growth', '', 'E04', '', 'Standards mapping + tagging + recommender uplift'],
  ['E25', 'Ethical AI governance', 'R&D', 'Identity & Compliance', '', 'E14,E10', '', 'Bias testing + transparency + oversight']
];

const SLICES = [
  ['S01', 'Roster import v0 (CSV)', 'E15', 'G2', 'CSV upload + parse', 'Roster table + mapping', 'Import succeeds + errors shown', 'Backlog', 'Integrations lead', ''],
  ['S02', 'Directory request→approve v0', 'E16', 'G2', 'Request form + admin view', 'Approval actions + audit', 'Approve/deny works end-to-end', 'Backlog', 'Integrations lead', ''],
  ['S03', 'Digest pipeline v0', 'E02', 'G3', 'Message events', 'Weekly digest job + email/notification', 'Digest runs w/ metrics + retries', 'Backlog', 'Core loops lead', ''],
  ['S04', 'RBAC enforcement v0', 'E13', 'G1', 'Role model', 'API guards + UI gating', 'Unauthorized actions blocked + logged', 'Backlog', 'Identity lead', ''],
  ['S05', 'Sync health dashboard v0', 'E10', 'G4', 'Integration job stats', 'Admin dashboard cards', 'Shows last sync + errors', 'Backlog', 'Admin/Analytics lead', 'S01'],
  ['S06', 'Office hours book/cancel v0', 'E05', 'G3', 'Teacher slots', 'Booking + notifications', 'Book/cancel + reminders', 'Backlog', 'Core loops lead', 'S04'],
  ['S07', 'Assignments list v0', 'E06', 'G3', 'One source connector', 'Assignments endpoint + UI list', 'Shows due dates, filters', 'Backlog', 'Integrations lead', 'S04,S01'],
  ['S08', 'SafeSpace report v0', 'E07', 'G3', 'Report form', 'Routing + audit trail', 'Restricted access + audit log', 'Backlog', 'Identity lead', 'S04'],
  ['S09', 'Partner submission v0', 'E08', 'G4', 'Partner form', 'Moderation queue', 'Submit→approve→publish', 'Backlog', 'Growth lead', 'S04'],
  ['S10', 'Execution board ops UI v1', 'E19', 'G0', 'Board API', 'Admin page + edit statuses', 'Editable board + audit', 'In Progress', 'Admin/Analytics lead', '']
];

const DEPENDENCIES = [
  ['E09', 'E13', 'blocks', 'Foundation before identity hardening'],
  ['E13', 'E15', 'blocks', 'Identity model required for provisioning'],
  ['E15', 'E02', 'blocks', 'Roster/directory needed for messaging targeting'],
  ['E02', 'E10', 'blocks', 'Messaging signals feed analytics'],
  ['E15', 'E11', 'blocks', 'Admin console depends on sync layer'],
  ['E13', 'E14', 'blocks', 'Compliance depends on identity + audit'],
  ['E14', 'E21', 'blocks', 'Moderation governance depends on safety framework'],
  ['E10', 'E12', 'blocks', 'Orchestrator needs observability + audit']
];

export const executionBoardSeed = {
  updatedAt: '2026-01-24',
  gates: GATES.map(([gate, purpose, items, ownerRole]) => {
    const dependsOn = gate === 'G0' ? '' : `G${Number(gate.slice(1)) - 1}`;
    return {
      gate,
      purpose,
      checklist: mkChecklist(items),
      ownerRole,
      dependsOn,
      targetWindow: '',
      status: 'Planned'
    };
  }),
  epics: EPICS.map(([id, workstream, tag, railSegment, gates, upstream, downstream, dod]) => ({
    id,
    workstream,
    tag,
    railSegment,
    ownerRole: '',
    upstream,
    downstream,
    gates,
    status: id === 'E19' ? 'In Progress' : 'Backlog',
    nextMilestone: '',
    dod,
    notes: '',
    railPriority: ['E09', 'E13', 'E15', 'E02'].includes(id)
  })),
  slices: SLICES.map(([id, outcome, primaryEpic, gate, inputs, deliverables, acceptance, status, owner, dependsOn]) => ({
    id,
    outcome,
    primaryEpic,
    gate,
    inputs,
    deliverables,
    acceptance,
    status,
    owner,
    dependsOn
  })),
  dependencies: DEPENDENCIES.map(([fromEpic, toEpic, type, notes], idx) => ({
    id: idx + 1,
    fromEpic,
    toEpic,
    type,
    notes
  }))
};
