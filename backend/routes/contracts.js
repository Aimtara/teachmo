/* eslint-env node */
import { Router } from 'express';
import { query } from '../db.js';
import { asUuidOrNull, getTenantScope, requireDistrictScope } from '../utils/tenantScope.js';
import { createLogger } from '../utils/logger.js';

const router = Router();
const logger = createLogger('routes.contracts');

async function safeQuery(res, sql, params = []) {
  try {
    return await query(sql, params);
  } catch (error) {
    logger.error('Database error', error);
    res.status(500).json({ error: 'db_error', detail: error.message });
    return null;
  }
}

router.get('/', requireDistrictScope, async (req, res) => {
  const { districtId, userId } = getTenantScope(req);
  const partnerId = asUuidOrNull(req.query.partnerId) || userId;

  const result = await safeQuery(
    res,
    `select id, partner_user_id, title, status, metadata, created_at, updated_at
       from public.partner_contracts
      where district_id = $1
        and ($2::uuid is null or partner_user_id = $2::uuid)
      order by created_at desc
      limit 500`,
    [districtId, partnerId]
  );
  if (!result) return;

  res.json(
    result.rows.map((row) => ({
      id: row.id,
      partnerId: row.partner_user_id,
      title: row.title,
      name: row.title,
      status: row.status,
      metadata: row.metadata,
      created_at: row.created_at,
    }))
  );
});

router.post('/', requireDistrictScope, async (req, res) => {
  const { districtId, userId } = getTenantScope(req);
  const partnerId = asUuidOrNull(req.body?.partnerId) || userId;
  if (!partnerId) return res.status(400).json({ error: 'partner scope required (x-user-id or partnerId)' });

  const { title, description } = req.body || {};
  if (!title) return res.status(400).json({ error: 'title required' });

  const metadata = description ? { description } : {};
  const result = await safeQuery(
    res,
    `insert into public.partner_contracts (partner_user_id, district_id, title, status, metadata)
     values ($1::uuid, $2::uuid, $3, 'pending', $4::jsonb)
     returning id, partner_user_id, title, status, metadata, created_at, updated_at`,
    [partnerId, districtId, title, JSON.stringify(metadata)]
  );
  if (!result) return;

  res.status(201).json({
    id: result.rows[0].id,
    partnerId: result.rows[0].partner_user_id,
    title: result.rows[0].title,
    name: result.rows[0].title,
    status: result.rows[0].status,
    metadata: result.rows[0].metadata,
    created_at: result.rows[0].created_at,
  });
});

export default router;
