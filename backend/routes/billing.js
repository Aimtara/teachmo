/* eslint-env node */
import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { asUuidOrNull, getTenantScope, requireDistrictScope } from '../utils/tenantScope.js';
import { logPartnerAction } from '../utils/partnerAudit.js';
import { createLogger } from '../utils/logger.js';

const router = Router();
const logger = createLogger('routes.billing');

router.use(requireAuth);
router.use(requireDistrictScope);

async function safeQuery(res, sql, params = []) {
  try {
    return await query(sql, params);
  } catch (error) {
    logger.error('Database error', error);
    res.status(500).json({ error: 'db_error', detail: error.message });
    return null;
  }
}

function computeTieredCommission(tiers, revenueAmount) {
  const revenue = Number(revenueAmount || 0);
  if (!tiers.length || revenue <= 0) return { commission: 0, breakdown: [] };

  const ordered = [...tiers].sort((a, b) => Number(a.min_volume || 0) - Number(b.min_volume || 0));
  let remaining = revenue;
  let commission = 0;
  const breakdown = [];

  ordered.forEach((tier) => {
    if (remaining <= 0) return;
    const min = Number(tier.min_volume || 0);
    const max = tier.max_volume === null ? null : Number(tier.max_volume);
    const available = Math.max(0, revenue - min);
    const tierVolume = max === null ? available : Math.max(0, Math.min(available, max - min));
    if (tierVolume <= 0) return;

    const rate = Number(tier.rate || 0);
    const tierCommission = tierVolume * rate;
    commission += tierCommission;
    remaining -= tierVolume;

    breakdown.push({
      min_volume: min,
      max_volume: max,
      rate,
      volume: tierVolume,
      commission: tierCommission
    });
  });

  return { commission, breakdown };
}

router.get('/commission-plans', async (req, res) => {
  const { districtId } = getTenantScope(req);
  const plansResult = await safeQuery(
    res,
    `select id, name, status, metadata, created_at, updated_at
       from public.partner_commission_plans
      where district_id = $1
      order by created_at desc
      limit 200`,
    [districtId]
  );
  if (!plansResult) return;

  const planIds = plansResult.rows.map((row) => row.id);
  const tiersResult = planIds.length
    ? await safeQuery(
        res,
        `select id, plan_id, min_volume, max_volume, rate, created_at
           from public.partner_commission_tiers
          where plan_id = any($1::uuid[])
          order by min_volume asc`,
        [planIds]
      )
    : { rows: [] };
  if (!tiersResult) return;

  const tiersByPlan = tiersResult.rows.reduce((acc, row) => {
    if (!acc[row.plan_id]) acc[row.plan_id] = [];
    acc[row.plan_id].push({
      id: row.id,
      min_volume: row.min_volume,
      max_volume: row.max_volume,
      rate: row.rate,
      created_at: row.created_at,
    });
    return acc;
  }, {});

  res.json(
    plansResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
      status: row.status,
      metadata: row.metadata,
      tiers: tiersByPlan[row.id] || [],
      created_at: row.created_at,
      updated_at: row.updated_at,
    }))
  );
});

router.post('/commission-plans', async (req, res) => {
  const { districtId, userId } = getTenantScope(req);
  const { name, status, metadata, tiers } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });

  const planResult = await safeQuery(
    res,
    `insert into public.partner_commission_plans (district_id, name, status, metadata)
     values ($1::uuid, $2, $3, $4::jsonb)
     returning id, name, status, metadata, created_at, updated_at`,
    [districtId, name, status || 'active', JSON.stringify(metadata || {})]
  );
  if (!planResult) return;

  const plan = planResult.rows[0];
  if (Array.isArray(tiers) && tiers.length) {
    for (const tier of tiers) {
      await safeQuery(
        res,
        `insert into public.partner_commission_tiers (plan_id, min_volume, max_volume, rate)
         values ($1::uuid, $2, $3, $4)`,
        [plan.id, tier.min_volume || 0, tier.max_volume ?? null, tier.rate || 0]
      );
    }
  }

  await logPartnerAction({
    districtId,
    partnerId: userId,
    actorId: userId,
    action: 'commission_plan_created',
    entity: 'partner_commission_plan',
    entityId: plan.id,
    metadata: { name: plan.name }
  });

  res.status(201).json(plan);
});

router.post('/commission-plans/:id/tiers', async (req, res) => {
  const planId = asUuidOrNull(req.params.id);
  if (!planId) return res.status(400).json({ error: 'invalid plan id' });
  const { min_volume, max_volume, rate } = req.body || {};
  if (rate === undefined || rate === null) return res.status(400).json({ error: 'rate required' });

  const result = await safeQuery(
    res,
    `insert into public.partner_commission_tiers (plan_id, min_volume, max_volume, rate)
     values ($1::uuid, $2, $3, $4)
     returning id, plan_id, min_volume, max_volume, rate, created_at`,
    [planId, min_volume || 0, max_volume ?? null, rate]
  );
  if (!result) return;

  res.status(201).json(result.rows[0]);
});

router.post('/commissions/calculate', async (req, res) => {
  const { planId, revenueAmount } = req.body || {};
  const resolvedPlanId = asUuidOrNull(planId);
  if (!resolvedPlanId) return res.status(400).json({ error: 'planId required' });

  const tiersResult = await safeQuery(
    res,
    `select min_volume, max_volume, rate
       from public.partner_commission_tiers
      where plan_id = $1::uuid
      order by min_volume asc`,
    [resolvedPlanId]
  );
  if (!tiersResult) return;

  const { commission, breakdown } = computeTieredCommission(tiersResult.rows, revenueAmount);
  res.json({
    planId: resolvedPlanId,
    revenueAmount: Number(revenueAmount || 0),
    commissionAmount: commission,
    breakdown,
  });
});

router.post('/commissions', async (req, res) => {
  const { districtId, userId } = getTenantScope(req);
  const partnerId = asUuidOrNull(req.body?.partnerId) || userId;
  if (!partnerId) return res.status(400).json({ error: 'partner scope required (x-user-id or partnerId)' });

  const { planId, revenueAmount, eventType, metadata } = req.body || {};
  const resolvedPlanId = asUuidOrNull(planId);
  if (!resolvedPlanId) return res.status(400).json({ error: 'planId required' });
  if (revenueAmount === undefined || revenueAmount === null) {
    return res.status(400).json({ error: 'revenueAmount required' });
  }

  const tiersResult = await safeQuery(
    res,
    `select min_volume, max_volume, rate
       from public.partner_commission_tiers
      where plan_id = $1::uuid
      order by min_volume asc`,
    [resolvedPlanId]
  );
  if (!tiersResult) return;

  const { commission, breakdown } = computeTieredCommission(tiersResult.rows, revenueAmount);
  const result = await safeQuery(
    res,
    `insert into public.partner_commission_events
      (district_id, partner_user_id, plan_id, revenue_amount, commission_amount, event_type, status, metadata)
     values ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, 'pending', $7::jsonb)
     returning id, partner_user_id, plan_id, revenue_amount, commission_amount, event_type, status, metadata, created_at`,
    [districtId, partnerId, resolvedPlanId, revenueAmount, commission, eventType || 'sale', JSON.stringify({
      ...metadata,
      breakdown,
    })]
  );
  if (!result) return;

  await safeQuery(
    res,
    `insert into public.partner_revenue_events
      (district_id, partner_user_id, revenue_amount, attribution_source, event_ts, metadata)
     values ($1::uuid, $2::uuid, $3, $4, now(), $5::jsonb)`,
    [districtId, partnerId, revenueAmount, eventType || 'sale', JSON.stringify({ planId: resolvedPlanId })]
  );

  const row = result.rows[0];
  await logPartnerAction({
    districtId,
    partnerId,
    actorId: userId,
    action: 'commission_recorded',
    entity: 'partner_commission_event',
    entityId: row.id,
    metadata: { planId: resolvedPlanId, commissionAmount: row.commission_amount }
  });

  res.status(201).json({
    id: row.id,
    partnerId: row.partner_user_id,
    planId: row.plan_id,
    revenueAmount: row.revenue_amount,
    commissionAmount: row.commission_amount,
    eventType: row.event_type,
    status: row.status,
    metadata: row.metadata,
    created_at: row.created_at,
  });
});

router.get('/commissions', async (req, res) => {
  const { districtId, userId } = getTenantScope(req);
  const partnerId = asUuidOrNull(req.query.partnerId) || userId;

  const result = await safeQuery(
    res,
    `select id, partner_user_id, plan_id, revenue_amount, commission_amount, event_type, status, metadata, created_at
       from public.partner_commission_events
      where district_id = $1
        and ($2::uuid is null or partner_user_id = $2::uuid)
      order by created_at desc
      limit 200`,
    [districtId, partnerId]
  );
  if (!result) return;

  res.json(
    result.rows.map((row) => ({
      id: row.id,
      partnerId: row.partner_user_id,
      planId: row.plan_id,
      revenueAmount: row.revenue_amount,
      commissionAmount: row.commission_amount,
      eventType: row.event_type,
      status: row.status,
      metadata: row.metadata,
      created_at: row.created_at,
    }))
  );
});

export default router;
