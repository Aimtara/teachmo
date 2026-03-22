/* eslint-env jest */

import { verifyResponse } from '../ai/verifierAgent.js';
import { getGovernedSkill, listGovernedSkills } from '../ai/skillRegistry.js';
import { executeGovernedAction, normalizeToolAction, buildToolAuditMetadata } from '../ai/actionAgent.js';

describe('verifierAgent', () => {
  test('passes through simple content', async () => {
    const result = await verifyResponse({
      content: 'Hello parent',
      decision: { denialReason: null },
      tenant: {},
      actor: {},
    });

    expect(result.ok).toBe(true);
    expect(result.content).toBe('Hello parent');
  });

  test('redacts pii when consent/guardian restrictions are active', async () => {
    const result = await verifyResponse({
      content: 'Email me at test@example.com or call 555-222-3333',
      decision: { denialReason: 'consent_required' },
      tenant: {},
      actor: {},
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContain('pii_redacted');
    expect(result.content).toContain('[redacted-email]');
    expect(result.content).toContain('[redacted-phone]');
  });

  test('flags empty response as an issue', async () => {
    const result = await verifyResponse({
      content: '   ',
      decision: {},
      tenant: {},
      actor: {},
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toContain('empty_response');
  });
});

describe('skillRegistry', () => {
  test('lists governed skills', () => {
    const skills = listGovernedSkills();
    expect(skills.length).toBeGreaterThan(0);
    expect(skills.some((s) => s.id === 'explore_routing')).toBe(true);
  });

  test('finds a governed skill by id', () => {
    const skill = getGovernedSkill('partner_submission');
    expect(skill).not.toBeNull();
    expect(skill.id).toBe('partner_submission');
  });
});

describe('actionAgent', () => {
  test('executes a governed skill', async () => {
    const skill = getGovernedSkill('explore_routing');
    const result = await executeGovernedAction({
      skill,
      input: { action: 'find_activities' },
      actor: { userId: 'u1' },
      tenant: { organizationId: 'o1' },
      requestId: 'req-1',
    });

    expect(result.ok).toBe(true);
    expect(result.skill).toBe('explore_routing');
    expect(result.result.route).toBe('/explore');
  });

  test('normalizes tool action aliases and metadata shape', () => {
    const normalized = normalizeToolAction({
      intent: 'submit_event',
      input: { title: 'Science fair' },
      child_id: 'c-1',
    });
    expect(normalized).toEqual({
      action: 'submit_event',
      payload: { title: 'Science fair' },
      childId: 'c-1',
    });

    const metadata = buildToolAuditMetadata({
      decision: { policyOutcome: 'queued', matchedPolicies: ['p1'], requiredSkill: 'partner_submission' },
      skill: { id: 'partner_submission' },
      actor: { userId: 'u1', role: 'teacher' },
      tenant: { organizationId: 'o1', schoolId: 's1' },
      requestId: 'req-1',
      toolInput: normalized,
      toolResult: { ok: true },
    });

    expect(metadata.policyOutcome).toBe('queued');
    expect(metadata.executedSkill).toBe('partner_submission');
    expect(metadata.toolInput.action).toBe('submit_event');
  });
});
