/* eslint-env jest */

import { redactPII } from '../middleware/redactPII.js';
import { callModel } from '../ai/llmAdapter.js';

jest.mock('../functions/invoke-llm.js', () => ({
  invokeLLM: jest.fn(async ({ prompt }) => ({
    content: prompt,
    usage: {},
    latencyMs: 1,
  })),
}));

describe('AI enforcement', () => {
  test('redacts pii', () => {
    const out = redactPII('email test@example.com phone 555-111-2222 ssn 123-45-6789');
    expect(out).not.toContain('test@example.com');
    expect(out).not.toContain('555-111-2222');
    expect(out).not.toContain('123-45-6789');
  });

  test('blocks model call without governance', async () => {
    await expect(
      callModel({ prompt: 'hi', model: 'gpt-4o-mini', governanceDecision: null })
    ).rejects.toThrow(/Missing governance decision/);
  });

  test('passes sanitized prompt to llm', async () => {
    const result = await callModel({
      prompt: 'email me at test@example.com',
      model: 'gpt-4o-mini',
      governanceDecision: { requestId: 'req-1', policyOutcome: 'allowed', matchedPolicies: [] },
      requestId: 'req-1',
    });

    expect(result.content).toContain('[redacted-email]');
  });
});
