/* eslint-env node */
import { Router } from 'express';
import { query } from '../db.js';
import { asUuidOrNull, getTenantScope, requireDistrictScope } from '../utils/tenantScope.js';

const router = Router();

// Tenant-scoped admin endpoints backing the Partner Portal.
// These endpoints previously used in-memory demo models; we now persist to Postgres
// using the same `public.partner_*` tables that are tracked in Hasura.

async function safeQuery(res, sql, params = []) {
  try {
    const result = await query(sql, params);
    return result;
  } catch (error) {
    console.error('[partnerPortalAdmin] db error', error);
    res.status(500).json({ error: 'db_error', detail: error.message });
    return null;
  }
}

router.get('/submissions', requireDistrictScope, async (req, res) => {
  const { districtId } = getTenantScope(req);
  const result = await safeQuery(
    res,
    `select id, type, title, description, status, reason, created_at, updated_at
     from public.partner_submissions
     where district_id = $1
     order by created_at desc
     limit 500`,
    [districtId]
  );
  if (!result) return;
  res.json(result.rows);
});

router.patch('/submissions/:id', requireDistrictScope, async (req, res) => {
  const { districtId, adminUserId } = getTenantScope(req);
  const id = asUuidOrNull(req.params.id);
  if (!id) return res.status(400).json({ error: 'invalid id' });
  const { status, reason } = req.body || {};
  if (!status) return res.status(400).json({ error: 'status required' });

  const updated = await safeQuery(
    res,
    `update public.partner_submissions
       set status = $2,
           reason = $3,
           updated_at = now()
     where id = $1 and district_id = $4
     returning id, type, title, description, status, reason, created_at, updated_at`,
    [id, status, reason ?? null, districtId]
  );
  if (!updated) return;
  if (!updated.rows[0]) return res.status(404).json({ error: 'not_found' });

  await safeQuery(
    res,
    `insert into public.partner_submission_audits (district_id, admin_user_id, entity, entity_id, action, reason)
     values ($1, $2, 'submission', $3, $4, $5)`,
    [districtId, adminUserId, id, status, reason ?? null]
  );

  res.json(updated.rows[0]);
});

router.get('/incentive-applications', requireDistrictScope, async (req, res) => {
  const { districtId } = getTenantScope(req);
  const result = await safeQuery(
    res,
    `select id, partner_user_id, incentive_id, title, status, payout, created_at
     from public.partner_incentive_applications
     where district_id = $1
     order by created_at desc
     limit 500`,
    [districtId]
  );
  if (!result) return;
  res.json(result.rows);
});

router.patch('/incentive-applications/:id', requireDistrictScope, async (req, res) => {
  const { districtId, adminUserId } = getTenantScope(req);
  const id = asUuidOrNull(req.params.id);
  if (!id) return res.status(400).json({ error: 'invalid id' });
  const { status, payout } = req.body || {};
  if (!status) return res.status(400).json({ error: 'status required' });

  const updated = await safeQuery(
    res,
    `update public.partner_incentive_applications
       set status = $2,
           payout = $3
     where id = $1 and district_id = $4
     returning id, partner_user_id, incentive_id, title, status, payout, created_at`,
    [id, status, payout ?? null, districtId]
  );
  if (!updated) return;
  if (!updated.rows[0]) return res.status(404).json({ error: 'not_found' });

  await safeQuery(
    res,
    `insert into public.partner_submission_audits (district_id, admin_user_id, entity, entity_id, action, reason)
     values ($1, $2, 'incentiveApplication', $3, $4, $5)`,
    [districtId, adminUserId, id, status, payout ?? null]
  );

  res.json(updated.rows[0]);
});

router.get('/contracts', requireDistrictScope, async (req, res) => {
  const { districtId } = getTenantScope(req);
  const result = await safeQuery(
    res,
    `select id, partner_user_id, title, status, metadata, created_at, updated_at
     from public.partner_contracts
     where district_id = $1
     order by created_at desc
     limit 500`,
    [districtId]
  );
  if (!result) return;
  res.json(result.rows);
});

router.patch('/contracts/:id', requireDistrictScope, async (req, res) => {
  const { districtId, adminUserId } = getTenantScope(req);
  const id = asUuidOrNull(req.params.id);
  if (!id) return res.status(400).json({ error: 'invalid id' });
  const { status } = req.body || {};
  if (!status) return res.status(400).json({ error: 'status required' });

  const updated = await safeQuery(
    res,
    `update public.partner_contracts
       set status = $2,
           updated_at = now()
     where id = $1 and district_id = $3
     returning id, partner_user_id, title, status, metadata, created_at, updated_at`,
    [id, status, districtId]
  );
  if (!updated) return;
  if (!updated.rows[0]) return res.status(404).json({ error: 'not_found' });

  await safeQuery(
    res,
    `insert into public.partner_submission_audits (district_id, admin_user_id, entity, entity_id, action)
     values ($1, $2, 'contract', $3, $4)`,
    [districtId, adminUserId, id, status]
  );

  res.json(updated.rows[0]);
});

router.get('/audits', requireDistrictScope, async (req, res) => {
  const { districtId } = getTenantScope(req);
  const result = await safeQuery(
    res,
    `select id, entity, entity_id, action, reason, event_ts
     from public.partner_submission_audits
     where district_id = $1
     order by event_ts desc
     limit 200`,
    [districtId]
  );
  if (!result) return;

  res.json(
    result.rows.map((row) => ({
      id: row.id,
      entity: row.entity,
      entityId: row.entity_id,
      action: row.action,
      reason: row.reason,
      timestamp: row.event_ts,
    }))
  );
});

export default router;
