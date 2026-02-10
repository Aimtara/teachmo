/* eslint-env node */
import { Router } from 'express';
import { query } from '../db.js';
import { asUuidOrNull, getTenantScope, requireDistrictScope } from '../utils/tenantScope.js';
import { createLogger } from '../utils/logger.js';
import { scanContent } from '../utils/contentSafety.js';

const router = Router();
const logger = createLogger('routes.submissions');

async function safeQuery(res, sql, params = []) {
  try {
    return await query(sql, params);
  } catch (error) {
    logger.error('Database error', error);
    res.status(500).json({ error: 'db_error', detail: error.message });
    return null;
  }
}

// List partner submissions scoped to a tenant.
router.get('/', requireDistrictScope, async (req, res) => {
  const { districtId, userId } = getTenantScope(req);
  const result = await safeQuery(
    res,
    `select id, type, title, description, status, reason, created_at, updated_at
     from public.partner_submissions
     where district_id = $1
       and ($2::uuid is null or partner_user_id = $2::uuid)
     order by created_at desc
     limit 500`,
    [districtId, userId],
  );
  if (!result) return;
  res.json(result.rows);
});

// Partner portal submission endpoint (supports legacy and new registration-form payloads).
router.post('/', async (req, res) => {
  const scope = getTenantScope(req);
  const body = req.body || {};

  const districtId = asUuidOrNull(body.districtId) || scope.districtId;
  const userId = asUuidOrNull(body.userId || body.partnerUserId) || scope.userId;

  if (!districtId) {
    return res.status(400).json({ error: 'district scope required (x-district-id or districtId)' });
  }

  const type = (body.type || body.submissionType || 'event').toString().trim().toLowerCase();
  const title = (body.title || body.programName || body.orgName || '').toString().trim();
  const description = (body.description || body.content || body.details || body.website || '').toString().trim();

  if (!title) return res.status(400).json({ error: 'title required' });

  const safetyCheck = scanContent({ title, description, metadata: body.metadata || null });
  const status = safetyCheck.isSafe ? 'pending' : 'flagged_safety';
  const reason = safetyCheck.isSafe ? null : safetyCheck.flags.join('; ');

  const result = await safeQuery(
    res,
    `insert into public.partner_submissions (partner_user_id, district_id, type, title, description, status, reason)
     values ($1::uuid, $2::uuid, $3, $4, $5, $6, $7)
     returning id, type, title, description, status, reason, created_at, updated_at`,
    [userId, districtId, type, title, description || null, status, reason],
  );
  if (!result) return;

  return res.status(201).json({
    ...result.rows[0],
    accepted: safetyCheck.isSafe,
    flags: safetyCheck.flags,
  });
});

// Update pending submissions (title/description only), scoped to tenant + partner.
router.put('/:id', requireDistrictScope, async (req, res) => {
  const { districtId, userId } = getTenantScope(req);
  if (!userId) return res.status(400).json({ error: 'user scope required (x-user-id)' });
  const id = asUuidOrNull(req.params.id);
  if (!id) return res.status(400).json({ error: 'invalid id' });

  const { title, description } = req.body || {};
  if (!title && !description) return res.status(400).json({ error: 'no changes' });

  const result = await safeQuery(
    res,
    `update public.partner_submissions
       set title = coalesce($2, title),
           description = coalesce($3, description),
           updated_at = now()
     where id = $1
       and district_id = $4
       and partner_user_id = $5
       and status = 'pending'
     returning id, type, title, description, status, reason, created_at, updated_at`,
    [id, title ?? null, description ?? null, districtId, userId],
  );
  if (!result) return;
  if (!result.rows[0]) return res.status(404).json({ error: 'not_found' });
  res.json(result.rows[0]);
});

export default router;
