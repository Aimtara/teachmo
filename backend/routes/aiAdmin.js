/* eslint-env node */
import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { requireFeatureFlag } from '../middleware/featureFlags.js';
import { recordAuditLog } from '../utils/audit.js';

const router = Router();

router.use(requireAuth);
router.use(requireTenant);
router.use(requireAdmin);

function buildTenantWhere({ organizationId, schoolId }) {
  if (schoolId) {
    return {
      where: 'organization_id = $1 and (school_id = $2 or school_id is null)',
      params: [organizationId, schoolId],
    };
  }
  return { where: 'organization_id = $1', params: [organizationId] };
}

router.get('/prompts', requireFeatureFlag('ENTERPRISE_AI_GOVERNANCE'), async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const { where, params } = buildTenantWhere({ organizationId, schoolId });
  const r = await query(
    `select p.id, p.name, p.description, p.school_id, p.is_archived, p.updated_at,
            v.id as version_id, v.version, v.is_active, v.created_at as version_created_at
     from ai_prompt_definitions p
     left join lateral (
       select v.id, v.version, v.is_active, v.created_at
       from ai_prompt_versions v
       where v.prompt_id = p.id
       order by v.version desc
       limit 1
     ) v on true
     where ${where}
     order by p.updated_at desc`,
    params
  );
  res.json({ prompts: r.rows || [] });
});

router.post('/prompts', requireFeatureFlag('ENTERPRISE_AI_GOVERNANCE'), async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const { name, description, content, variables, metadata } = req.body || {};
  if (!name || !content) return res.status(400).json({ error: 'missing name/content' });

  const promptInsert = await query(
    `insert into ai_prompt_definitions
      (organization_id, school_id, name, description, created_by, updated_by)
     values ($1, $2, $3, $4, $5, $6)
     returning id`,
    [organizationId, schoolId || null, name, description || null, req.auth?.userId || null, req.auth?.userId || null]
  );
  const promptId = promptInsert.rows?.[0]?.id;

  const versionInsert = await query(
    `insert into ai_prompt_versions
      (prompt_id, version, content, variables, metadata, is_active, created_by)
     values ($1, 1, $2, $3::jsonb, $4::jsonb, true, $5)
     returning id, version`,
    [promptId, content, JSON.stringify(variables || {}), JSON.stringify(metadata || {}), req.auth?.userId || null]
  );

  await query(`update ai_prompt_definitions set updated_at = now() where id = $1`, [promptId]);

  await recordAuditLog({
    actorId: req.auth?.userId,
    action: 'ai_prompt.created',
    entityType: 'ai_prompt',
    entityId: promptId,
    metadata: { version: 1 },
    organizationId,
    schoolId,
  });

  res.status(201).json({
    id: promptId,
    versionId: versionInsert.rows?.[0]?.id,
    version: versionInsert.rows?.[0]?.version,
  });
});

router.put('/prompts/:id', requireFeatureFlag('ENTERPRISE_AI_GOVERNANCE'), async (req, res) => {
  const { organizationId } = req.tenant;
  const { id } = req.params;
  const { name, description, isArchived } = req.body || {};

  await query(
    `update ai_prompt_definitions
     set name = coalesce($3, name),
         description = coalesce($4, description),
         is_archived = coalesce($5, is_archived),
         updated_by = $6,
         updated_at = now()
     where id = $1 and organization_id = $2`,
    [id, organizationId, name ?? null, description ?? null, isArchived ?? null, req.auth?.userId || null]
  );

  await recordAuditLog({
    actorId: req.auth?.userId,
    action: 'ai_prompt.updated',
    entityType: 'ai_prompt',
    entityId: id,
    metadata: { name, description, isArchived },
    organizationId,
    schoolId: req.tenant.schoolId,
  });

  res.json({ id });
});

router.get('/prompts/:id/versions', requireFeatureFlag('ENTERPRISE_AI_GOVERNANCE'), async (req, res) => {
  const { organizationId } = req.tenant;
  const { id } = req.params;
  const r = await query(
    `select id, version, content, variables, metadata, is_active, created_at
     from ai_prompt_versions
     where prompt_id = $1
     order by version desc`,
    [id]
  );

  const prompt = await query(
    `select id, name, description, is_archived
     from ai_prompt_definitions
     where id = $1 and organization_id = $2`,
    [id, organizationId]
  );

  res.json({ prompt: prompt.rows?.[0] ?? null, versions: r.rows || [] });
});

router.post('/prompts/:id/versions', requireFeatureFlag('ENTERPRISE_AI_GOVERNANCE'), async (req, res) => {
  const { organizationId } = req.tenant;
  const { id } = req.params;
  const { content, variables, metadata, setActive } = req.body || {};
  if (!content) return res.status(400).json({ error: 'missing content' });

  const versionResult = await query(
    `select coalesce(max(version), 0) + 1 as next_version
     from ai_prompt_versions where prompt_id = $1`,
    [id]
  );
  const nextVersion = Number(versionResult.rows?.[0]?.next_version || 1);

  if (setActive) {
    await query(
      `update ai_prompt_versions set is_active = false where prompt_id = $1`,
      [id]
    );
  }

  const insert = await query(
    `insert into ai_prompt_versions
      (prompt_id, version, content, variables, metadata, is_active, created_by)
     values ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7)
     returning id, version, is_active`,
    [
      id,
      nextVersion,
      content,
      JSON.stringify(variables || {}),
      JSON.stringify(metadata || {}),
      Boolean(setActive),
      req.auth?.userId || null,
    ]
  );

  await query(`update ai_prompt_definitions set updated_at = now() where id = $1`, [id]);

  await recordAuditLog({
    actorId: req.auth?.userId,
    action: 'ai_prompt.versioned',
    entityType: 'ai_prompt',
    entityId: id,
    metadata: { version: nextVersion, isActive: Boolean(setActive) },
    organizationId,
    schoolId: req.tenant.schoolId,
  });

  res.status(201).json({ id: insert.rows?.[0]?.id, version: insert.rows?.[0]?.version });
});

router.get('/budget', requireFeatureFlag('ENTERPRISE_AI_GOVERNANCE'), async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const r = await query(
    `select monthly_limit_usd, spent_usd, reset_at, fallback_policy
     from ai_tenant_budgets
     where organization_id = $1 and school_id is not distinct from $2`,
    [organizationId, schoolId || null]
  );
  res.json({ budget: r.rows?.[0] ?? null });
});

router.put('/budget', requireFeatureFlag('ENTERPRISE_AI_GOVERNANCE'), async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const { monthlyLimitUsd, fallbackPolicy, resetAt } = req.body || {};

  const existing = await query(
    `select organization_id from ai_tenant_budgets where organization_id = $1 and school_id is not distinct from $2`,
    [organizationId, schoolId || null]
  );

  if (existing.rows?.length) {
    await query(
      `update ai_tenant_budgets
       set monthly_limit_usd = $3,
           fallback_policy = coalesce($4, fallback_policy),
           reset_at = coalesce($5, reset_at),
           updated_at = now()
       where organization_id = $1 and school_id is not distinct from $2`,
      [organizationId, schoolId || null, monthlyLimitUsd ?? null, fallbackPolicy ?? null, resetAt ?? null]
    );
  } else {
    await query(
      `insert into ai_tenant_budgets
        (organization_id, school_id, monthly_limit_usd, fallback_policy, reset_at)
       values ($1, $2, $3, $4, $5)`,
      [organizationId, schoolId || null, monthlyLimitUsd ?? null, fallbackPolicy || 'block', resetAt || null]
    );
  }

  await recordAuditLog({
    actorId: req.auth?.userId,
    action: 'ai_budget.updated',
    entityType: 'ai_budget',
    entityId: organizationId,
    metadata: { monthlyLimitUsd, fallbackPolicy, resetAt, schoolId },
    organizationId,
    schoolId,
  });

  res.json({ success: true });
});

router.get('/model-policy', requireFeatureFlag('ENTERPRISE_AI_GOVERNANCE'), async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const r = await query(
    `select id, default_model, fallback_model, allowed_models, feature_flags
     from ai_model_policies
     where organization_id = $1 and school_id is not distinct from $2`,
    [organizationId, schoolId || null]
  );
  res.json({ policy: r.rows?.[0] ?? null });
});

router.put('/model-policy', requireFeatureFlag('ENTERPRISE_AI_GOVERNANCE'), async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const { defaultModel, fallbackModel, allowedModels, featureFlags } = req.body || {};
  if (!defaultModel) return res.status(400).json({ error: 'defaultModel required' });

  const existing = await query(
    `select id from ai_model_policies where organization_id = $1 and school_id is not distinct from $2`,
    [organizationId, schoolId || null]
  );

  if (existing.rows?.length) {
    await query(
      `update ai_model_policies
       set default_model = $3,
           fallback_model = $4,
           allowed_models = $5::jsonb,
           feature_flags = $6::jsonb,
           updated_by = $7,
           updated_at = now()
       where organization_id = $1 and school_id is not distinct from $2`,
      [
        organizationId,
        schoolId || null,
        defaultModel,
        fallbackModel || null,
        JSON.stringify(allowedModels || []),
        JSON.stringify(featureFlags || []),
        req.auth?.userId || null,
      ]
    );
  } else {
    await query(
      `insert into ai_model_policies
        (organization_id, school_id, default_model, fallback_model, allowed_models, feature_flags, created_by, updated_by)
       values ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8)`,
      [
        organizationId,
        schoolId || null,
        defaultModel,
        fallbackModel || null,
        JSON.stringify(allowedModels || []),
        JSON.stringify(featureFlags || []),
        req.auth?.userId || null,
        req.auth?.userId || null,
      ]
    );
  }

  await recordAuditLog({
    actorId: req.auth?.userId,
    action: 'ai_model_policy.updated',
    entityType: 'ai_model_policy',
    entityId: organizationId,
    metadata: { defaultModel, fallbackModel, allowedModels, featureFlags, schoolId },
    organizationId,
    schoolId,
  });

  res.json({ success: true });
});

router.get('/usage', requireFeatureFlag('ENTERPRISE_AI_GOVERNANCE'), async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const { where, params } = buildTenantWhere({ organizationId, schoolId });

  const r = await query(
    `select id, created_at, actor_id, actor_role, model, token_total, cost_usd, prompt_id, prompt_version_id,
            safety_risk_score, reviewer_status, response
     from ai_interactions
     where ${where}
     order by created_at desc
     limit ${limit}`,
    params
  );
  res.json({ usage: r.rows || [] });
});

router.get('/usage-summary', requireFeatureFlag('ENTERPRISE_AI_GOVERNANCE'), async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const { where, params } = buildTenantWhere({ organizationId, schoolId });

  const r = await query(
    `select model,
            count(*) as calls,
            sum(token_total) as tokens,
            sum(cost_usd) as cost_usd
     from ai_interactions
     where ${where}
     group by model
     order by calls desc`,
    params
  );

  const total = await query(
    `select count(*) as calls, sum(cost_usd) as cost_usd
     from ai_interactions
     where ${where}`,
    params
  );

  res.json({
    totals: {
      calls: Number(total.rows?.[0]?.calls || 0),
      cost_usd: Number(total.rows?.[0]?.cost_usd || 0),
    },
    byModel: r.rows || [],
  });
});

router.get('/review-queue', requireFeatureFlag('ENTERPRISE_AI_REVIEW'), async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const { where, params } = buildTenantWhere({ organizationId, schoolId });

  const r = await query(
    `select q.id, q.status, q.reason, q.created_at, q.reviewer_id, q.reviewed_at,
            i.model, i.safety_risk_score, i.prompt, i.response, i.cost_usd
     from ai_review_queue q
     join ai_interactions i on i.id = q.interaction_id
     where ${where} and q.status = 'pending'
     order by q.created_at desc
     limit 100`,
    params
  );
  res.json({ queue: r.rows || [] });
});

router.post('/review-queue/:id/decision', requireFeatureFlag('ENTERPRISE_AI_REVIEW'), async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const { id } = req.params;
  const { status, reason, notes } = req.body || {};

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'invalid status' });
  }

  await query(
    `update ai_review_queue
     set status = $3, reviewer_id = $4, reviewed_at = now(), reason = $5
     where id = $1 and organization_id = $2`,
    [id, organizationId, status, req.auth?.userId || null, reason ?? null]
  );

  await query(
    `update ai_interactions
     set reviewer_status = $2, reviewer_id = $3, reviewed_at = now()
     where id = (select interaction_id from ai_review_queue where id = $1)`,
    [id, status, req.auth?.userId || null]
  );

  await query(
    `insert into ai_review_actions (queue_id, action, actor_id, notes)
     values ($1, $2, $3, $4)`,
    [id, status, req.auth?.userId || null, notes || null]
  );

  await recordAuditLog({
    actorId: req.auth?.userId,
    action: `ai_review.${status}`,
    entityType: 'ai_review',
    entityId: id,
    metadata: { reason, notes },
    organizationId,
    schoolId,
  });

  res.json({ id, status });
});

export default router;
