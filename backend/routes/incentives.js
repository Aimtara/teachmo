/* eslint-env node */
import { Router } from 'express';
import { query } from '../db.js';
import { requireTenant } from '../middleware/tenant.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { requireScopes } from '../middleware/scopes.js';

const router = Router();

router.use(requireAuth);
router.use(requireTenant);

router.get('/', requireScopes(['partner:resources', 'partner:admin'], { any: true }), async (req, res) => {
  const { organizationId } = req.tenant;
  const r = await query(
    `select id, title, description, value, status, created_at, updated_at
     from partner_incentives
     where organization_id = $1
     order by created_at desc`,
    [organizationId]
  );
  res.json(r.rows || []);
});

router.post('/', requireAdmin, requireScopes('partner:admin'), async (req, res) => {
  const { organizationId } = req.tenant;
  const { title, value, description } = req.body || {};
  if (!title) return res.status(400).json({ error: 'title required' });

  const r = await query(
    `insert into partner_incentives (organization_id, title, description, value)
     values ($1,$2,$3,$4)
     returning id, title, description, value, status, created_at, updated_at`,
    [organizationId, title, description || null, value || null]
  );
  res.status(201).json(r.rows?.[0]);
});

router.post('/:id/apply', requireScopes('partner:resources'), async (req, res) => {
  const { organizationId } = req.tenant;
  const { id } = req.params;
  const partnerId = req.auth?.userId || null;

  const existing = await query(
    `select id from partner_incentive_applications where incentive_id = $1 and partner_id = $2`,
    [id, partnerId]
  );
  if (existing.rows?.length) return res.status(400).json({ error: 'already applied' });

  const r = await query(
    `insert into partner_incentive_applications (organization_id, incentive_id, partner_id)
     values ($1,$2,$3)
     returning id, incentive_id, partner_id, status, payout, created_at, updated_at`,
    [organizationId, id, partnerId]
  );
  res.status(201).json(r.rows?.[0]);
});

router.get('/applications/me', requireScopes('partner:resources'), async (req, res) => {
  const { organizationId } = req.tenant;
  const partnerId = req.auth?.userId || null;
  const r = await query(
    `select id, incentive_id, partner_id, status, payout, created_at, updated_at
     from partner_incentive_applications
     where organization_id = $1 and partner_id = $2
     order by created_at desc`,
    [organizationId, partnerId]
  );
  res.json(r.rows || []);
});

export default router;
