/* eslint-env node */

import { verifyResponse } from '../ai/verifierAgent.js';

export async function applyPostResponseGovernance({
  req,
  content,
}) {
  const shouldVerify = Boolean(req.governanceEnabled || req.toolGovernanceEnabled);

  if (!shouldVerify) {
    return {
      verifier: { ok: true, issues: [] },
      content,
    };
  }

  const verifier = await verifyResponse({
    content,
    decision: req.governanceDecision,
    tenant: req.tenant || {},
    actor: req.auth || {},
  });

  return {
    verifier,
    content: verifier.content,
  };
}
