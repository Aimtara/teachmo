/* eslint-env node */
import { Router } from 'express';
import { query } from '../db.js';
import { requireTenant } from '../middleware/tenant.js';
import { requireAuth } from '../middleware/auth.js';
import { requireFeatureFlag } from '../middleware/featureFlags.js';

const router = Router();

router.use(requireAuth);
router.use(requireTenant);
router.use(requireFeatureFlag('AI_ASSISTANT'));

const MODEL_COSTS = {
  'gpt-4o': 5 / 1000,
  'gpt-4o-mini': 0.6 / 1000,
  'gpt-4-turbo': 10 / 1000,
  'gpt-3.5-turbo': 0.5 / 1000,
};

function estimateCost({ tokenTotal, model }) {
  if (!tokenTotal) return 0;
  const rate = MODEL_COSTS[model] ?? MODEL_COSTS['gpt-4o-mini'];
  return Number(((tokenTotal / 1000) * rate).toFixed(6));
}

function getNextResetAt() {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));
  return next.toISOString();
}

async function loadBudget(organizationId, schoolId) {
  const { rows } = await query(
    `select organization_id, school_id, monthly_limit_usd, spent_usd, reset_at, fallback_policy
     from ai_tenant_budgets
     where organization_id = $1 and school_id is not distinct from $2`,
    [organizationId, schoolId || null]
  );
  const budget = rows?.[0];
  if (!budget) return null;

  if (budget.reset_at && new Date(budget.reset_at) <= new Date()) {
    const nextReset = getNextResetAt();
    const update = await query(
      `update ai_tenant_budgets
       set spent_usd = 0, reset_at = $3, updated_at = now()
       where organization_id = $1 and school_id is not distinct from $2
       returning organization_id, school_id, monthly_limit_usd, spent_usd, reset_at, fallback_policy`,
      [organizationId, schoolId || null, nextReset]
    );
    return update.rows?.[0] ?? budget;
  }

  return budget;
}

async function updateBudgetSpend({ organizationId, schoolId, costUsd }) {
  if (!costUsd) return null;
  const budget = await loadBudget(organizationId, schoolId);
  if (!budget) return null;

  const spent = Number(budget.spent_usd || 0) + Number(costUsd || 0);
  const resetAt = budget.reset_at || getNextResetAt();
  const update = await query(
    `update ai_tenant_budgets
     set spent_usd = $3, reset_at = $4, updated_at = now()
     where organization_id = $1 and school_id is not distinct from $2
     returning organization_id, school_id, monthly_limit_usd, spent_usd, reset_at, fallback_policy`,
    [organizationId, schoolId || null, spent, resetAt]
  );
  return update.rows?.[0] ?? budget;
}

async function loadModelPolicy(organizationId, schoolId) {
  const { rows } = await query(
    `select id, default_model, fallback_model, allowed_models, feature_flags
     from ai_model_policies
     where organization_id = $1 and school_id is not distinct from $2`,
    [organizationId, schoolId || null]
  );
  return rows?.[0] ?? null;
}

function resolveModel({ policy, preferredModel, featureFlags = {} }) {
  if (!policy) {
    return {
      model: preferredModel || 'gpt-4o-mini',
      reason: policy ? 'policy_default' : 'no_policy',
    };
  }

  const allowed = Array.isArray(policy.allowed_models) ? policy.allowed_models : [];
  let selected = preferredModel || policy.default_model;
  if (allowed.length && !allowed.includes(selected)) {
    selected = policy.default_model;
  }

  const requiredFlags = Array.isArray(policy.feature_flags) ? policy.feature_flags : [];
  const unmetFlags = requiredFlags.filter((flag) => !featureFlags?.[flag]);
  if (unmetFlags.length) {
    selected = policy.fallback_model || policy.default_model;
  }

  return {
    model: selected,
    reason: unmetFlags.length ? 'feature_flag_fallback' : 'policy_default',
    unmetFlags,
  };
}

router.post('/resolve-model', async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const { preferredModel, estimatedTokens, featureFlags, promptId } = req.body || {};

  const policy = await loadModelPolicy(organizationId, schoolId);
  const budget = await loadBudget(organizationId, schoolId);
  const resolved = resolveModel({ policy, preferredModel, featureFlags });
  const estimatedCost = estimateCost({ tokenTotal: estimatedTokens, model: resolved.model });
  const limit = budget?.monthly_limit_usd ? Number(budget.monthly_limit_usd) : null;
  const spent = budget?.spent_usd ? Number(budget.spent_usd) : 0;
  const budgetExceeded = limit !== null && spent + estimatedCost > limit;

  let finalModel = resolved.model;
  let blocked = false;
  let fallbackReason = null;

  if (budgetExceeded) {
    const policyFallback = budget?.fallback_policy || 'block';
    if (policyFallback === 'degrade') {
      finalModel = policy?.fallback_model || policy?.default_model || resolved.model;
      fallbackReason = 'budget_degraded';
    } else if (policyFallback === 'allow') {
      fallbackReason = 'budget_allow';
    } else {
      blocked = true;
      fallbackReason = 'budget_blocked';
    }
  }

  let prompt = null;
  if (promptId) {
    const promptResult = await query(
      `select p.id, p.name, v.id as version_id, v.content, v.variables
       from ai_prompt_definitions p
       left join ai_prompt_versions v on v.prompt_id = p.id and v.is_active = true
       where p.id = $1 and p.organization_id = $2`,
      [promptId, organizationId]
    );
    prompt = promptResult.rows?.[0] ?? null;
  }

  return res.json({
    allowed: !blocked,
    model: finalModel,
    policy: policy ? { defaultModel: policy.default_model, fallbackModel: policy.fallback_model } : null,
    budget: budget
      ? {
          monthlyLimitUsd: budget.monthly_limit_usd,
          spentUsd: budget.spent_usd,
          fallbackPolicy: budget.fallback_policy,
          resetAt: budget.reset_at,
        }
      : null,
    estimatedCost,
    budgetExceeded,
    reason: fallbackReason || resolved.reason,
    prompt,
  });
});

router.post('/log', async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const {
    prompt,
    response,
    tokenPrompt,
    tokenResponse,
    tokenTotal,
    safetyRiskScore,
    safetyFlags,
    model,
    metadata,
    childId,
    latencyMs,
    inputs,
    outputs,
    promptId,
    promptVersionId,
    userId,
    reviewRequired,
    reviewReason,
    costUsd
  } = req.body || {};

  if (!prompt || !response) return res.status(400).json({ error: 'missing prompt/response' });

  const calculatedCost = costUsd ?? estimateCost({ tokenTotal, model });

  const r = await query(
    `insert into ai_interactions
      (organization_id, school_id, actor_id, actor_role, child_id, prompt, response, token_prompt, token_response, token_total,
       safety_risk_score, safety_flags, model, metadata, latency_ms, inputs, outputs, prompt_id, prompt_version_id, user_id, cost_usd)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14::jsonb,$15,$16::jsonb,$17::jsonb,$18,$19,$20,$21)
     returning id`,
    [
      organizationId,
      schoolId || null,
      req.auth?.userId || null,
      req.auth?.role || null,
      childId || null,
      prompt,
      response,
      tokenPrompt || null,
      tokenResponse || null,
      tokenTotal || null,
      safetyRiskScore ?? null,
      JSON.stringify(safetyFlags || []),
      model || null,
      JSON.stringify(metadata || {}),
      latencyMs ?? null,
      JSON.stringify(inputs || {}),
      JSON.stringify(outputs || {}),
      promptId || null,
      promptVersionId || null,
      userId || req.auth?.userId || null,
      calculatedCost ?? null
    ]
  );

  const interactionId = r.rows?.[0]?.id;

  if (interactionId) {
    await query(
      `insert into ai_cost_ledger (organization_id, school_id, interaction_id, model, token_total, cost_usd)
       values ($1, $2, $3, $4, $5, $6)`,
      [organizationId, schoolId || null, interactionId, model || null, tokenTotal || null, calculatedCost || null]
    );
  }

  if (calculatedCost) {
    await updateBudgetSpend({ organizationId, schoolId, costUsd: calculatedCost });
  }

  if (reviewRequired && interactionId) {
    await query(
      `insert into ai_review_queue
        (organization_id, school_id, interaction_id, status, reason, requested_by)
       values ($1, $2, $3, 'pending', $4, $5)`,
      [organizationId, schoolId || null, interactionId, reviewReason || null, req.auth?.userId || null]
    );
  }

  res.status(201).json({ id: interactionId, costUsd: calculatedCost ?? null });
});

router.post('/review-requests', async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const { interactionId, reason } = req.body || {};

  if (!interactionId) return res.status(400).json({ error: 'missing interactionId' });

  const r = await query(
    `insert into ai_review_queue
      (organization_id, school_id, interaction_id, status, reason, requested_by)
     values ($1, $2, $3, 'pending', $4, $5)
     returning id`,
    [organizationId, schoolId || null, interactionId, reason || null, req.auth?.userId || null]
  );

  res.status(201).json({ id: r.rows?.[0]?.id });
});

router.get('/prompts/:id/active', async (req, res) => {
  const { organizationId } = req.tenant;
  const { id } = req.params;
  const r = await query(
    `select p.id, p.name, p.description, v.id as version_id, v.version, v.content, v.variables, v.metadata
     from ai_prompt_definitions p
     left join ai_prompt_versions v on v.prompt_id = p.id and v.is_active = true
     where p.id = $1 and p.organization_id = $2 and p.is_archived = false`,
    [id, organizationId]
  );
  if (!r.rows?.length) return res.status(404).json({ error: 'prompt not found' });
  res.json({ prompt: r.rows[0] });
});

export default router;
