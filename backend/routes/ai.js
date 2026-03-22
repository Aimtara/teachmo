/* eslint-env node */
import { Router } from 'express';
import { query } from '../db.js';
import { requireTenant } from '../middleware/tenant.js';
import { requireAuth } from '../middleware/auth.js';
import { requireFeatureFlag } from '../middleware/featureFlags.js';
import { requirePermission } from '../middleware/permissions.js';
import { auditEvent } from '../security/audit.js';
import { callModel } from '../ai/llmAdapter.js';
import { query as dbQuery } from '../db.js';
import { preRequestHook } from '../middleware/aiGovernance.js';
import { preToolGovernance } from '../middleware/preToolGovernance.js';
import { applyPostResponseGovernance } from '../middleware/postResponseGovernance.js';
import { getGovernedSkill, listGovernedSkills } from '../ai/skillRegistry.js';
import { executeGovernedAction, normalizeToolAction, buildToolAuditMetadata } from '../ai/actionAgent.js';
import { requireGovernance } from '../middleware/requireGovernance.js';
import { buildGovernanceMetadata } from '../ai/governanceMetadata.js';
import { isBlocked } from '../ai/enforcementRules.js';

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

function enforceBudget({ budget, policy, selectedModel }) {
  const limit = budget?.monthly_limit_usd ? Number(budget.monthly_limit_usd) : null;
  const spent = budget?.spent_usd ? Number(budget.spent_usd) : 0;
  const budgetExceeded = limit !== null && spent >= limit;

  if (!budgetExceeded) {
    return { blocked: false, model: selectedModel, reason: 'budget_ok' };
  }

  const fallback = budget?.fallback_policy || 'block';
  if (fallback === 'degrade') {
    return {
      blocked: false,
      model: policy?.fallback_model || policy?.default_model || selectedModel,
      reason: 'budget_degraded',
    };
  }
  if (fallback === 'allow') {
    return { blocked: false, model: selectedModel, reason: 'budget_allow' };
  }
  return { blocked: true, model: selectedModel, reason: 'budget_blocked' };
}

function isGovernanceTerminalOutcome(outcome) {
  return outcome === 'blocked' || outcome === 'rerouted' || outcome === 'queued' || outcome === 'escalated';
}

router.post('/completion', requirePermission('generate', 'ai'), preRequestHook, requireGovernance, async (req, res) => {
  const { prompt, model, context, featureFlags } = req.body || {};
  const { organizationId, schoolId } = req.tenant;
  const govDecision = req.governanceDecision || null;
  if (!prompt) {
    return res.status(400).json({ error: 'missing prompt' });
  }

  try {
    const policy = await loadModelPolicy(organizationId, schoolId);
    const budget = await loadBudget(organizationId, schoolId);
    const resolved = resolveModel({ policy, preferredModel: model, featureFlags });
    const budgetResult = enforceBudget({ budget, policy, selectedModel: resolved.model });
    const shouldShortCircuit = isGovernanceTerminalOutcome(govDecision?.policyOutcome);

    if (budgetResult.blocked) {
      await auditEvent(req, {
        eventType: 'ai_budget_blocked',
        severity: 'warn',
        meta: { organizationId, schoolId, model: resolved.model },
      });
      return res.status(429).json({ error: 'AI budget exceeded for this month.' });
    }

    if (isBlocked(govDecision)) {
      return res.status(403).json({
        error: govDecision.denialReason || 'governance_blocked',
        governance: buildGovernanceMetadata(govDecision),
      });
    }

    const rawResponse = shouldShortCircuit
      ? null
      : await callModel({
          prompt,
          model: budgetResult.model,
          governanceDecision: govDecision,
          requestId: govDecision?.requestId,
          context,
          user: req.auth?.userId,
        });

    let effectiveContent = rawResponse?.content ?? null;
    let governanceAction = 'allow';

    if (govDecision?.policyOutcome === 'rerouted' || govDecision?.policyOutcome === 'queued' || govDecision?.policyOutcome === 'escalated') {
      governanceAction = govDecision.policyOutcome;
      effectiveContent = JSON.stringify({
        governed: true,
        requestId: govDecision.requestId,
        policyOutcome: govDecision.policyOutcome,
        requiredSkill: govDecision.requiredSkill,
        denialReason: govDecision.denialReason,
        message:
          govDecision.policyOutcome === 'queued'
            ? 'Your request has been routed for governed handling.'
            : govDecision.policyOutcome === 'escalated'
              ? 'Your request requires escalation for additional review.'
              : 'Your request has been rerouted to a governed skill flow.',
      });
    }

    const usage = rawResponse?.usage || {};
    const tokenPrompt = Number(usage.prompt_tokens || 0);
    const tokenResponse = Number(usage.completion_tokens || 0);
    const tokenTotal = Number(usage.total_tokens || tokenPrompt + tokenResponse);
    const costUsd = estimateCost({ tokenTotal, model: budgetResult.model });

    const governanceMetadata = govDecision
      ? {
          governanceAction,
          verifier: null,
          source: 'completion',
          governance: buildGovernanceMetadata(govDecision, {
            enabled: Boolean(req.governanceEnabled),
          }),
        }
      : { source: 'completion' };

    const post = await applyPostResponseGovernance({
      req,
      content: effectiveContent,
    });

    if (govDecision && governanceMetadata.governance) {
      governanceMetadata.verifier = post.verifier;
    }
    effectiveContent = post.content;

    const log = await query(
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
        null,
        prompt,
        effectiveContent,
        tokenPrompt || null,
        tokenResponse || null,
        tokenTotal || null,
        null,
        JSON.stringify([]),
        budgetResult.model,
        JSON.stringify(governanceMetadata),
        rawResponse?.latencyMs ?? null,
        JSON.stringify({ context: context ?? null }),
        JSON.stringify({ content: effectiveContent }),
        null,
        null,
        req.auth?.userId || null,
        costUsd || null,
      ]
    );

    const interactionId = log.rows?.[0]?.id;
    if (interactionId && costUsd) {
      await query(
        `insert into ai_cost_ledger (organization_id, school_id, interaction_id, model, token_total, cost_usd)
         values ($1, $2, $3, $4, $5, $6)`,
        [organizationId, schoolId || null, interactionId, budgetResult.model, tokenTotal || null, costUsd]
      );
      await updateBudgetSpend({ organizationId, schoolId, costUsd });
    }

    return res.json({
      content: effectiveContent,
      model: budgetResult.model,
      usage,
      governance: govDecision
        ? {
            requestId: govDecision.requestId,
            shadowMode: false,
            policyOutcome: govDecision.policyOutcome,
            requiredSkill: govDecision.requiredSkill,
            verifier: post.verifier,
          }
        : undefined,
    });
  } catch (error) {
    console.error('AI Completion Error:', error);
    return res.status(500).json({ error: 'AI processing failed' });
  }
});

router.post('/tool', requirePermission('generate', 'ai'), preRequestHook, requireGovernance, preToolGovernance, async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const toolInput = normalizeToolAction(req.body || {});
  const govDecision = req.governanceDecision || null;

  if (!req.toolGovernanceEnabled) {
    return res.status(403).json({ error: 'tool governance disabled' });
  }

  if (!govDecision?.requiredSkill) {
    return res.status(400).json({ error: 'no governed skill required for this request' });
  }

  const skill = getGovernedSkill(govDecision.requiredSkill);
  if (!skill) {
    return res.status(404).json({ error: 'governed skill not found' });
  }
  if (toolInput.action && Array.isArray(skill.allowedActions) && !skill.allowedActions.includes(toolInput.action)) {
    return res.status(403).json({ error: 'action not permitted for required governed skill' });
  }

  try {
    const actionResult = await executeGovernedAction({
      skill,
      input: toolInput,
      actor: req.auth || {},
      tenant: req.tenant || {},
      requestId: govDecision.requestId,
    });

    const post = await applyPostResponseGovernance({
      req,
      content: JSON.stringify(actionResult.result ?? {}),
    });

    const metadata = buildToolAuditMetadata({
      decision: govDecision,
      skill,
      actor: req.auth || {},
      tenant: req.tenant || {},
      requestId: govDecision.requestId,
      toolInput,
      toolResult: actionResult,
    });

    await dbQuery(
      `insert into ai_interactions
        (organization_id, school_id, actor_id, actor_role, child_id, prompt, response, token_prompt, token_response, token_total,
         safety_risk_score, safety_flags, model, metadata, latency_ms, inputs, outputs, prompt_id, prompt_version_id, user_id, cost_usd)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14::jsonb,$15,$16::jsonb,$17::jsonb,$18,$19,$20,$21)`,
      [
        organizationId,
        schoolId || null,
        req.auth?.userId || null,
        req.auth?.role || null,
        toolInput.childId || null,
        JSON.stringify(toolInput),
        post.content,
        null,
        null,
        null,
        null,
        JSON.stringify([]),
        'governed_tool',
        JSON.stringify({ ...metadata, verifier: post.verifier, source: 'tool' }),
        actionResult.latencyMs ?? null,
        JSON.stringify(toolInput),
        JSON.stringify(actionResult.result ?? {}),
        null,
        null,
        req.auth?.userId || null,
        null,
      ]
    );

    return res.json({
      ok: true,
      tool: skill.id,
      governance: govDecision,
      result: actionResult.result,
      verifier: post.verifier,
    });
  } catch (error) {
    return res.status(500).json({ error: 'governed tool execution failed' });
  }
});

router.get('/skills', requirePermission('generate', 'ai'), async (_req, res) => {
  return res.json({ skills: listGovernedSkills() });
});

router.post('/resolve-model', async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const { preferredModel, estimatedTokens, featureFlags, promptId, max_tokens: maxTokens } = req.body || {};

  const policy = await loadModelPolicy(organizationId, schoolId);
  const budget = await loadBudget(organizationId, schoolId);
  const resolved = resolveModel({ policy, preferredModel, featureFlags });

  const allowedModels = Array.isArray(policy?.allowed_models) && policy.allowed_models.length
    ? policy.allowed_models
    : [policy?.default_model].filter(Boolean);
  const sortedAllowed = [...allowedModels].sort(
    (a, b) => (MODEL_COSTS[a] ?? Infinity) - (MODEL_COSTS[b] ?? Infinity)
  );

  let selectedModel = resolved.model;
  let selectionReason = resolved.reason;
  let remainingFraction = null;

  const limit = budget?.monthly_limit_usd ? Number(budget.monthly_limit_usd) : null;
  const spent = budget?.spent_usd ? Number(budget.spent_usd) : 0;
  if (limit !== null && limit > 0) {
    remainingFraction = (limit - spent) / limit;
  }

  const tokenEstimate = Number(estimatedTokens ?? maxTokens ?? 0);
  if (tokenEstimate && tokenEstimate < 1000 && sortedAllowed.length) {
    selectedModel = sortedAllowed[0];
    selectionReason = 'low_complexity';
  }

  if (remainingFraction !== null && remainingFraction <= 0.1 && sortedAllowed.length) {
    selectedModel = sortedAllowed[0];
    selectionReason = 'budget_low';
  }

  if (remainingFraction !== null && remainingFraction < 0) {
    selectedModel = policy?.fallback_model || sortedAllowed[0] || selectedModel;
    selectionReason = 'budget_exceeded';
  }

  const estimatedCost = estimateCost({ tokenTotal: tokenEstimate, model: selectedModel });
  const budgetExceeded = limit !== null && spent + estimatedCost > limit;

  let finalModel = selectedModel;
  let blocked = false;
  let fallbackReason = null;

  if (budgetExceeded) {
    const policyFallback = budget?.fallback_policy || 'block';
    if (policyFallback === 'degrade') {
      finalModel = policy?.fallback_model || policy?.default_model || selectedModel;
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
    reason: fallbackReason || selectionReason,
    budgetRemaining: remainingFraction,
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
