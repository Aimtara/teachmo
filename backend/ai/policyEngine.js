/* eslint-env node */

import {
  createGovernanceDecision,
  POLICY_OUTCOMES,
  TIERS,
} from './governanceDecision.js';
import { auditEventBare } from '../security/audit.js';

const EXPLORE_INTENTS = new Set([
  'explore_deep_link',
  'find_activities',
  'creative_activities',
  'outdoor_activities',
  'educational_activities',
  'local_events',
  'playdates',
  'browse_all',
  'library',
]);

const DISCOVERY_ROUTES = new Set(['explore_deep_link']);

const PARTNER_SUBMISSION_INTENTS = new Set([
  'submit_event',
  'submit_resource',
  'submit_offer',
]);

const COACHING_ROUTES = new Set([
  'homework_help',
  'weekly_brief_generate',
  'office_hours_book',
]);

const SCHOOL_SCOPED_ROLES = new Set(['teacher', 'school_admin']);
const SCHOOL_REQUEST_INTENTS = new Set(['school_request', 'school_participation']);

export async function evaluatePolicy(ctx) {
  const start = Date.now();
  const {
    requestId,
    role,
    intent,
    hasChildData = false,
    consentScope = [],
    guardianVerified = false,
    safetyEscalate = false,
    authContext = {},
    tenantContext = {},
  } = ctx;

  const normalizedRole = String(role || '').trim().toLowerCase();
  const normalizedIntent = String(intent || '').trim().toLowerCase();

  const matchedPolicies = [];
  let policyOutcome = POLICY_OUTCOMES.ALLOWED;
  let denialReason = null;
  let requiredSkill = null;
  let tier = TIERS.TIER_1;

  if (SCHOOL_SCOPED_ROLES.has(normalizedRole)) {
    const actorSchoolId = authContext?.schoolId ?? null;
    const tenantSchoolId = tenantContext?.schoolId ?? null;
    if (actorSchoolId && tenantSchoolId && actorSchoolId !== tenantSchoolId) {
      matchedPolicies.push('POL-ABAC-001');
      return createGovernanceDecision({
        requestId,
        tier: TIERS.TIER_2,
        policyOutcome: POLICY_OUTCOMES.BLOCKED,
        matchedPolicies,
        denialReason: 'scope_violation',
        requiresAuditEvent: true,
        latencyMs: Date.now() - start,
      });
    }
  }

  if (safetyEscalate) {
    matchedPolicies.push('POL-SAFETY-001');
    return createGovernanceDecision({
      requestId,
      tier: TIERS.TIER_3,
      policyOutcome: POLICY_OUTCOMES.ESCALATED,
      matchedPolicies,
      denialReason: 'safety_escalation_required',
      requiredSkill: 'safety_escalation',
      requiresAuditEvent: true,
      latencyMs: Date.now() - start,
    });
  }

  if (hasChildData && (!guardianVerified || !consentScope.includes('child_data'))) {
    matchedPolicies.push('POL-CHILD-001');
    return createGovernanceDecision({
      requestId,
      tier: TIERS.TIER_2,
      policyOutcome: POLICY_OUTCOMES.BLOCKED,
      matchedPolicies,
      denialReason: !guardianVerified ? 'guardian_verification_required' : 'consent_required',
      requiredSkill: 'consent_and_child_data',
      requiresAuditEvent: true,
      latencyMs: Date.now() - start,
    });
  }

  if (DISCOVERY_ROUTES.has(normalizedIntent) || EXPLORE_INTENTS.has(normalizedIntent)) {
    matchedPolicies.push('POL-EXPLORE-001');
    policyOutcome = POLICY_OUTCOMES.REROUTED;
    requiredSkill = 'explore_routing';
    tier = TIERS.TIER_1;
  } else if (PARTNER_SUBMISSION_INTENTS.has(normalizedIntent) || normalizedRole === 'partner') {
    matchedPolicies.push('POL-PARTNER-001');
    policyOutcome = POLICY_OUTCOMES.QUEUED;
    requiredSkill = 'partner_submission';
    tier = TIERS.TIER_2;
  } else if (SCHOOL_REQUEST_INTENTS.has(normalizedIntent)) {
    matchedPolicies.push('POL-SCHOOL-001');
    policyOutcome = POLICY_OUTCOMES.QUEUED;
    requiredSkill = 'school_request';
    tier = TIERS.TIER_2;
  } else if (COACHING_ROUTES.has(normalizedIntent) || normalizedIntent === 'coach') {
    matchedPolicies.push('POL-COACH-001');
    policyOutcome = POLICY_OUTCOMES.REROUTED;
    requiredSkill = 'parent_coach';
    tier = TIERS.TIER_1;
  }

  return createGovernanceDecision({
    requestId,
    tier,
    policyOutcome,
    matchedPolicies,
    denialReason,
    requiredSkill,
    requiresAuditEvent: policyOutcome !== POLICY_OUTCOMES.ALLOWED,
    latencyMs: Date.now() - start,
  });
}

export async function recordGovernanceDecision({ decision, actorId, organizationId, schoolId }) {
  await auditEventBare({
    eventType: 'ai.governance_decision',
    severity: decision.policyOutcome === POLICY_OUTCOMES.BLOCKED ? 'warn' : 'info',
    userId: actorId ?? null,
    meta: {
      organizationId: organizationId ?? null,
      schoolId: schoolId ?? null,
      tier: decision.tier,
      policyOutcome: decision.policyOutcome,
      matchedPolicies: decision.matchedPolicies,
      denialReason: decision.denialReason,
      requiredSkill: decision.requiredSkill,
      requestId: decision.requestId,
      latencyMs: decision.latencyMs,
    },
  });
}
