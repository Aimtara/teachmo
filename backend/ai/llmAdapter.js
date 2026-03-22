/* eslint-env node */

import { redactPII } from '../middleware/redactPII.js';
import { buildGovernanceMetadata } from './governanceMetadata.js';
import { invokeLLM } from '../functions/invoke-llm.js';

export async function callModel({
  prompt,
  model,
  governanceDecision,
  requestId,
  context = {},
  user = null,
}) {
  if (!governanceDecision) {
    throw new Error('Missing governance decision');
  }

  const sanitizedPrompt = redactPII(prompt);
  if (!sanitizedPrompt || !String(sanitizedPrompt).trim()) {
    throw new Error('Prompt failed redaction or became empty');
  }

  const governanceExtra = requestId !== undefined ? { requestId } : {};

  return invokeLLM({
    prompt: sanitizedPrompt,
    model,
    context: {
      ...context,
      governance: buildGovernanceMetadata(governanceDecision, governanceExtra),
    },
    user,
  });
}
