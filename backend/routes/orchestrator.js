/* eslint-env node */
import { Router } from 'express';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { runOrchestrator } from '../orchestrator/orchestrator.js';

const router = Router();

router.use(requireAuth);
router.use(requireTenant);

router.post('/route', async (req, res) => {
  const body = req.body || {};
  const actor = {
    userId: req.auth?.userId,
    role: req.auth?.role
  };
  const request = {
    requestId: body.requestId || crypto.randomUUID(),
    actor,
    channel: body.channel || 'CHAT',
    text: body.text || '',
    selected: body.selected || {},
    metadata: body.metadata || {}
  };

  if (!request.actor.userId) {
    return res.status(400).json({ error: 'missing actor' });
  }

  const output = await runOrchestrator({ request, auth: req.auth, tenant: req.tenant });
  return res.json(output);
});

export default router;
