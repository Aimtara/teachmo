/* eslint-env node */
import { Router } from 'express';
import { query } from '../db.js';
import { requireTenant } from '../middleware/tenant.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.use(requireTenant);

router.get('/settings', async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const r = await query(
    `select organization_id, school_id, branding, settings
     from tenant_settings
     where organization_id = $1 and (school_id = $2 or school_id is null)
     order by school_id desc nulls last
     limit 1`,
    [organizationId, schoolId || null]
  );
  res.json({ settings: r.rows?.[0] || { organization_id: organizationId, school_id: schoolId } });
});

router.put('/settings', requireAdmin, async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const { branding, settings } = req.body || {};
  const r = await query(
    `insert into tenant_settings (organization_id, school_id, branding, settings)
     values ($1, $2, $3::jsonb, $4::jsonb)
     on conflict (organization_id, school_id)
     do update set branding = excluded.branding, settings = excluded.settings, updated_at = now()
     returning organization_id, school_id, branding, settings`,
    [
      organizationId,
      schoolId || null,
      JSON.stringify(branding || {}),
      JSON.stringify(settings || {})
    ]
  );
  res.json({ settings: r.rows?.[0] });
});

export default router;
