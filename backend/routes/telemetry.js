/* eslint-env node */
import { Router } from 'express';
import { query } from '../db.js';
import { requireTenant } from '../middleware/tenant.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.use(requireTenant);

router.post('/telemetry', async (req, res) => {
  const { organizationId, schoolId } = req.tenant;
  const { event, metadata, source } = req.body || {};
  if (!event) {
    return res.status(400).json({ error: 'event required' });
  }

  const r = await query(
    `insert into analytics_events
      (event_name, event_ts, organization_id, school_id, actor_id, actor_role, metadata, source)
     values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)
     returning id`,
    [
      event,
      new Date().toISOString(),
      organizationId,
      schoolId || null,
      req.auth?.userId || null,
      req.auth?.role || null,
      JSON.stringify(metadata || {}),
      source || 'web'
    ]
  );

  return res.status(201).json({ id: r.rows?.[0]?.id });
});

export default router;
