/* eslint-env node */

export async function executeGovernedAction({
  skill,
  input = {},
  actor = {},
  tenant = {},
  requestId = null,
}) {
  if (!skill || typeof skill.execute !== 'function') {
    throw new Error('Invalid governed skill');
  }

  const startedAt = Date.now();
  const result = await skill.execute({
    input,
    actor,
    tenant,
    requestId,
  });

  return {
    ok: true,
    skill: skill.id,
    requestId,
    latencyMs: Date.now() - startedAt,
    result: result ?? null,
  };
}

export function normalizeToolAction(body = {}) {
  return {
    action: body.action || body.intent || null,
    payload: body.payload || body.input || {},
    childId: body.childId || body.child_id || null,
  };
}

export function buildToolAuditMetadata({
  decision,
  skill,
  actor,
  tenant,
  requestId,
  toolInput,
  toolResult,
}) {
  return {
    requestId,
    actorId: actor?.userId ?? null,
    role: actor?.role ?? null,
    organizationId: tenant?.organizationId ?? null,
    schoolId: tenant?.schoolId ?? null,
    policyOutcome: decision?.policyOutcome ?? null,
    matchedPolicies: decision?.matchedPolicies ?? [],
    denialReason: decision?.denialReason ?? null,
    requiredSkill: decision?.requiredSkill ?? null,
    executedSkill: skill?.id ?? null,
    toolInput,
    toolResult,
  };
}
