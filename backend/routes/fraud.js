/* eslint-env node */
import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAnyScope } from '../middleware/permissions.js';
import { asUuidOrNull, getTenantScope, requireDistrictScope } from '../utils/tenantScope.js';
import { logPartnerAction } from '../utils/partnerAudit.js';
import { createLogger } from '../utils/logger.js';

const router = Router();
const logger = createLogger('routes.fraud');

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

router.get('/signals', requireAnyScope(['partner:admin', 'partner:portal']), async (req, res) => {
  const { districtId } = getTenantScope(req);
  const partnerId = asUuidOrNull(req.query.partnerId);
  const status = req.query.status ? String(req.query.status) : null;
  const params = [districtId];
  let where = 'district_id = $1';
  if (partnerId) {
    params.push(partnerId);
    where += ` and partner_user_id = $${params.length}`;
  }
  if (status) {
    params.push(status);
    where += ` and status = $${params.length}`;
  }

  const result = await safeQuery(
    res,
    `select id, partner_user_id, signal_type, severity, status, metadata, created_at, updated_at
       from public.partner_fraud_signals
      where ${where}
      order by created_at desc
      limit 200`,
    params
  );
  if (!result) return;

  res.json(
    result.rows.map((row) => ({
      id: row.id,
      partnerId: row.partner_user_id,
      signalType: row.signal_type,
      severity: row.severity,
      status: row.status,
      metadata: row.metadata,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }))
  );
});

router.post('/signals', requireAnyScope(['partner:admin', 'partner:portal']), async (req, res) => {
  const { districtId, userId } = getTenantScope(req);
  const partnerId = asUuidOrNull(req.body?.partnerId) || userId;
  if (!partnerId) return res.status(400).json({ error: 'partner scope required (x-user-id or partnerId)' });

  const { signalType, severity, metadata } = req.body || {};
  if (!signalType) return res.status(400).json({ error: 'signalType required' });

  const result = await safeQuery(
    res,
    `insert into public.partner_fraud_signals
      (district_id, partner_user_id, signal_type, severity, status, metadata)
     values ($1::uuid, $2::uuid, $3, $4, 'open', $5::jsonb)
     returning id, partner_user_id, signal_type, severity, status, metadata, created_at, updated_at`,
    [districtId, partnerId, signalType, severity || 'medium', JSON.stringify(metadata || {})]
  );
  if (!result) return;

  const row = result.rows[0];
  await logPartnerAction({
    districtId,
    partnerId,
    actorId: userId,
    action: 'fraud_signal_created',
    entity: 'partner_fraud_signal',
    entityId: row.id,
    metadata: { signalType: row.signal_type, severity: row.severity }
  });

  res.status(201).json({
    id: row.id,
    partnerId: row.partner_user_id,
    signalType: row.signal_type,
    severity: row.severity,
    status: row.status,
    metadata: row.metadata,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
});

router.patch('/signals/:id', requireAnyScope(['partner:admin']), async (req, res) => {
  const { districtId, userId } = getTenantScope(req);
  const id = asUuidOrNull(req.params.id);
  if (!id) return res.status(400).json({ error: 'invalid id' });

  const { status, metadata } = req.body || {};
  if (!status) return res.status(400).json({ error: 'status required' });

  const result = await safeQuery(
    res,
    `update public.partner_fraud_signals
        set status = $2,
            metadata = coalesce(metadata, '{}'::jsonb) || $3::jsonb,
            updated_at = now()
      where id = $1 and district_id = $4
      returning id, partner_user_id, signal_type, severity, status, metadata, created_at, updated_at`,
    [id, status, JSON.stringify(metadata || {}), districtId]
  );
  if (!result) return;
  if (!result.rows[0]) return res.status(404).json({ error: 'not_found' });

  const row = result.rows[0];
  await logPartnerAction({
    districtId,
    partnerId: row.partner_user_id,
    actorId: userId,
    action: 'fraud_signal_updated',
    entity: 'partner_fraud_signal',
    entityId: row.id,
    metadata: { status: row.status }
  });

  res.json({
    id: row.id,
    partnerId: row.partner_user_id,
    signalType: row.signal_type,
    severity: row.severity,
    status: row.status,
    metadata: row.metadata,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
});

router.post('/signals/:id/reviews', requireAnyScope(['partner:admin']), async (req, res) => {
  const { districtId, userId } = getTenantScope(req);
  const signalId = asUuidOrNull(req.params.id);
  if (!signalId) return res.status(400).json({ error: 'invalid id' });

  const { outcome, notes } = req.body || {};
  if (!outcome) return res.status(400).json({ error: 'outcome required' });

  const reviewResult = await safeQuery(
    res,
    `insert into public.partner_fraud_reviews (signal_id, reviewer_id, outcome, notes)
     values ($1::uuid, $2::uuid, $3, $4)
     returning id, signal_id, reviewer_id, outcome, notes, created_at`,
    [signalId, userId, outcome, notes || null]
  );
  if (!reviewResult) return;

  const updateResult = await safeQuery(
    res,
    `update public.partner_fraud_signals
        set status = 'reviewed',
            updated_at = now()
      where id = $1 and district_id = $2
      returning id, partner_user_id`,
    [signalId, districtId]
  );
  if (!updateResult) return;

  const signal = updateResult.rows[0];
  await logPartnerAction({
    districtId,
    partnerId: signal?.partner_user_id,
    actorId: userId,
    action: 'fraud_review_recorded',
    entity: 'partner_fraud_review',
    entityId: reviewResult.rows[0].id,
    metadata: { outcome }
  });

  res.status(201).json(reviewResult.rows[0]);
});

export default router;
