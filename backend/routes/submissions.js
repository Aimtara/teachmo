/* eslint-env node */
import { Router } from 'express';
import { query } from '../db.js';
import { requireTenant } from '../middleware/tenant.js';
import { requireAuth } from '../middleware/auth.js';
import { requireScopes } from '../middleware/scopes.js';

const router = Router();

router.use(requireAuth);
router.use(requireTenant);

router.get('/', requireScopes(['partner:submissions', 'partner:admin'], { any: true }), async (req, res) => {
  const { organizationId } = req.tenant;
  const role = req.auth?.role || '';
  const params = [organizationId];
  let where = 'organization_id = $1';
  if (role === 'partner') {
    where += ' and partner_id = $2';
    params.push(req.auth?.userId || null);
  }

  const r = await query(
    `select id, partner_id, type, title, description, status, reason, created_at, updated_at
     from partner_submissions
     where ${where}
     order by created_at desc`,
    params
  );
  res.json(r.rows || []);
});

router.post('/', requireScopes('partner:submissions'), async (req, res) => {
  const { organizationId } = req.tenant;
  const { type, title, description } = req.body || {};
  if (!type || !title) {
    return res.status(400).json({ error: 'type and title are required' });
  }

  const r = await query(
    `insert into partner_submissions (organization_id, partner_id, type, title, description)
     values ($1,$2,$3,$4,$5)
     returning id, partner_id, type, title, description, status, reason, created_at, updated_at`,
    [organizationId, req.auth?.userId || null, type, title, description || null]
  );
  res.status(201).json(r.rows?.[0]);
});

router.put('/:id', requireScopes('partner:submissions'), async (req, res) => {
  const { organizationId } = req.tenant;
  const { id } = req.params;
  const { title, description } = req.body || {};

  const current = await query(
    `select id, status from partner_submissions where id = $1 and organization_id = $2 and partner_id = $3`,
    [id, organizationId, req.auth?.userId || null]
  );
  if (!current.rows?.length) return res.status(404).json({ error: 'not found' });
  if (current.rows[0].status !== 'pending') return res.status(400).json({ error: 'only pending editable' });

  const r = await query(
    `update partner_submissions
     set title = coalesce($4, title),
         description = coalesce($5, description),
         updated_at = now()
     where id = $1 and organization_id = $2 and partner_id = $3
     returning id, partner_id, type, title, description, status, reason, created_at, updated_at`,
    [id, organizationId, req.auth?.userId || null, title || null, description || null]
  );
  res.json(r.rows?.[0]);
});

export default router;
