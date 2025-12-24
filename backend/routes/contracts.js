/* eslint-env node */
import { Router } from 'express';
import { query } from '../db.js';
import { requireTenant } from '../middleware/tenant.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { requireScopes } from '../middleware/scopes.js';

const router = Router();

router.use(requireAuth);
router.use(requireTenant);

router.get('/', requireScopes(['partner:portal', 'partner:admin'], { any: true }), async (req, res) => {
  const { organizationId } = req.tenant;
  const role = req.auth?.role || '';
  const params = [organizationId];
  let where = 'organization_id = $1';
  if (role === 'partner') {
    where += ' and partner_id = $2';
    params.push(req.auth?.userId || null);
  }

  const r = await query(
    `select id, partner_id, title, description, status, signed_at, created_at, updated_at
     from partner_contracts
     where ${where}
     order by created_at desc`,
    params
  );
  res.json(r.rows || []);
});

router.post('/', requireAdmin, requireScopes('partner:admin'), async (req, res) => {
  const { organizationId } = req.tenant;
  const { partnerId, title, description } = req.body || {};
  if (!partnerId || !title) return res.status(400).json({ error: 'partnerId and title required' });

  const r = await query(
    `insert into partner_contracts (organization_id, partner_id, title, description)
     values ($1,$2,$3,$4)
     returning id, partner_id, title, description, status, signed_at, created_at, updated_at`,
    [organizationId, partnerId, title, description || null]
  );
  res.status(201).json(r.rows?.[0]);
});

export default router;
