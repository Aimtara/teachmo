/* eslint-env jest */

import { evaluatePolicy } from '../ai/policyEngine.js';
import {
  POLICY_OUTCOMES,
  TIERS,
  createGovernanceDecision,
} from '../ai/governanceDecision.js';

describe('governanceDecision', () => {
  test('creates a valid immutable decision', () => {
    const decision = createGovernanceDecision({
      requestId: 'req-1',
      tier: TIERS.TIER_1,
      policyOutcome: POLICY_OUTCOMES.ALLOWED,
    });

    expect(decision.requestId).toBe('req-1');
    expect(decision.tier).toBe(1);
    expect(decision.policyOutcome).toBe('allowed');
  });

  test('throws on invalid outcome', () => {
    expect(() =>
      createGovernanceDecision({ policyOutcome: 'wat' })
    ).toThrow(/Invalid policyOutcome/);
  });
});

describe('PolicyEngine', () => {
  test('safety escalation returns ESCALATED tier 3', async () => {
    const dec = await evaluatePolicy({
      requestId: 'test-safety-1',
      role: 'parent',
      intent: 'chat',
      safetyEscalate: true,
    });

    expect(dec.policyOutcome).toBe(POLICY_OUTCOMES.ESCALATED);
    expect(dec.tier).toBe(TIERS.TIER_3);
    expect(dec.requiredSkill).toBe('safety_escalation');
    expect(dec.matchedPolicies).toContain('POL-SAFETY-001');
  });

  test('teacher crossing school scope is blocked', async () => {
    const dec = await evaluatePolicy({
      requestId: 'test-abac-1',
      role: 'teacher',
      intent: 'chat',
      authContext: { schoolId: 'school-a' },
      tenantContext: { schoolId: 'school-b' },
    });

    expect(dec.policyOutcome).toBe(POLICY_OUTCOMES.BLOCKED);
    expect(dec.denialReason).toBe('scope_violation');
    expect(dec.matchedPolicies).toContain('POL-ABAC-001');
  });

  test('child data without guardian verification is blocked', async () => {
    const dec = await evaluatePolicy({
      requestId: 'test-child-1',
      role: 'parent',
      intent: 'chat',
      hasChildData: true,
      guardianVerified: false,
    });

    expect(dec.policyOutcome).toBe(POLICY_OUTCOMES.BLOCKED);
    expect(dec.denialReason).toBe('guardian_verification_required');
    expect(dec.requiredSkill).toBe('consent_and_child_data');
  });

  test('child data without consent is blocked', async () => {
    const dec = await evaluatePolicy({
      requestId: 'test-child-2',
      role: 'parent',
      intent: 'chat',
      hasChildData: true,
      guardianVerified: true,
      consentScope: ['profile'],
    });

    expect(dec.policyOutcome).toBe(POLICY_OUTCOMES.BLOCKED);
    expect(dec.denialReason).toBe('consent_required');
  });

  test('discovery routes reroute to explore_routing', async () => {
    const dec = await evaluatePolicy({
      requestId: 'test-explore-1',
      role: 'parent',
      intent: 'find_activities',
    });

    expect(dec.policyOutcome).toBe(POLICY_OUTCOMES.REROUTED);
    expect(dec.requiredSkill).toBe('explore_routing');
    expect(dec.tier).toBe(TIERS.TIER_1);
  });

  test('partner submissions queue for review', async () => {
    const dec = await evaluatePolicy({
      requestId: 'test-partner-1',
      role: 'parent',
      intent: 'submit_event',
    });

    expect(dec.policyOutcome).toBe(POLICY_OUTCOMES.QUEUED);
    expect(dec.requiredSkill).toBe('partner_submission');
    expect(dec.tier).toBe(TIERS.TIER_2);
  });

  test('school requests queue for review', async () => {
    const dec = await evaluatePolicy({
      requestId: 'test-school-1',
      role: 'parent',
      intent: 'school_request',
    });

    expect(dec.policyOutcome).toBe(POLICY_OUTCOMES.QUEUED);
    expect(dec.requiredSkill).toBe('school_request');
    expect(dec.tier).toBe(TIERS.TIER_2);
  });

  test('coaching intents reroute to parent_coach', async () => {
    const dec = await evaluatePolicy({
      requestId: 'test-coach-1',
      role: 'parent',
      intent: 'HOMEWORK_HELP',
    });

    expect(dec.policyOutcome).toBe(POLICY_OUTCOMES.REROUTED);
    expect(dec.requiredSkill).toBe('parent_coach');
    expect(dec.tier).toBe(TIERS.TIER_1);
  });

  test('ordinary chat remains allowed', async () => {
    const dec = await evaluatePolicy({
      requestId: 'test-allowed-1',
      role: 'parent',
      intent: 'chat',
    });

    expect(dec.policyOutcome).toBe(POLICY_OUTCOMES.ALLOWED);
    expect(dec.tier).toBe(TIERS.TIER_1);
    expect(dec.matchedPolicies).toEqual([]);
  });
});
