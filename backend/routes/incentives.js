/* eslint-env node */
import { Router } from 'express';
import { incentives } from '../models.js';
import { query } from '../db.js';
import { asUuidOrNull, getTenantScope, requireDistrictScope } from '../utils/tenantScope.js';

const router = Router();

async function safeQuery(res, sql, params = []) {
  try {
    return await query(sql, params);
  } catch (error) {
    console.error('[incentives] db error', error);
    res.status(500).json({ error: 'db_error', detail: error.message });
    return null;
  }
}

// Incentive catalog remains a configuration list (currently seeded demo data).
router.get('/', (req, res) => {
  res.json(incentives);
});

// List applications for a partner (tenant + partner scoped).
router.get('/applications/:partnerId', requireDistrictScope, async (req, res) => {
  const { districtId, userId } = getTenantScope(req);
  const partnerId = asUuidOrNull(req.params.partnerId) || userId;
  if (!partnerId) return res.status(400).json({ error: 'partner scope required (x-user-id or partnerId)' });

  const result = await safeQuery(
    res,
    `select id, partner_user_id, incentive_id, title, status, payout, created_at
       from public.partner_incentive_applications
      where district_id = $1
        and partner_user_id = $2::uuid
      order by created_at desc
      limit 500`,
    [districtId, partnerId]
  );
  if (!result) return;

  res.json(
    result.rows.map((row) => ({
      id: row.id,
      partnerId: row.partner_user_id,
      incentiveId: row.incentive_id,
      title: row.title,
      status: row.status,
      payout: row.payout,
      created_at: row.created_at,
    }))
  );
});

// Apply for an incentive.
router.post('/:id/apply', requireDistrictScope, async (req, res) => {
  const { districtId, userId } = getTenantScope(req);
  const partnerId = asUuidOrNull(req.body?.partnerId) || userId;
  if (!partnerId) return res.status(400).json({ error: 'partner scope required (x-user-id or partnerId)' });

  const incentiveId = String(req.params.id);
  const incentive = incentives.find((i) => String(i.id) === incentiveId);
  if (!incentive) return res.status(404).json({ error: 'incentive_not_found' });

  const result = await safeQuery(
    res,
    `insert into public.partner_incentive_applications (partner_user_id, district_id, incentive_id, title, status)
     values ($1::uuid, $2::uuid, $3, $4, 'submitted')
     returning id, partner_user_id, incentive_id, title, status, payout, created_at`,
    [partnerId, districtId, incentiveId, incentive.title]
  );
  if (!result) return;

  res.status(201).json({
    id: result.rows[0].id,
    partnerId: result.rows[0].partner_user_id,
    incentiveId: result.rows[0].incentive_id,
    title: result.rows[0].title,
    status: result.rows[0].status,
    payout: result.rows[0].payout,
    created_at: result.rows[0].created_at,
  });
});

export default router;
