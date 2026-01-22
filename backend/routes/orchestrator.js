/* eslint-env node */
import { Router } from 'express';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { runOrchestrator } from '../orchestrator/orchestrator.js';
import { orchestratorEngine } from '../orchestrator/engine.js';

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

// POST /api/orchestrator/signal
router.post('/signal', (req, res) => {
  try {
    const decision = orchestratorEngine.ingest(req.body);
    res.json(decision);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

router.post('/:familyId/run-daily', (req, res) => {
  try {
    const plan = orchestratorEngine.runDaily(req.params.familyId);
    res.json(plan);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

router.post('/:familyId/run-weekly', async (req, res) => {
  try {
    const brief = await orchestratorEngine.runWeekly(req.params.familyId);
    res.json(brief);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

router.get('/:familyId/digest', (req, res) => {
  try {
    res.json({ digest: orchestratorEngine.getDigest(req.params.familyId) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

router.post('/:familyId/digest/mark-delivered', (req, res) => {
  try {
    res.json({ digest: orchestratorEngine.markDigestDelivered(req.params.familyId) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

router.get('/:familyId/plans/daily', (req, res) => {
  try {
    res.json({ plans: orchestratorEngine.getDailyPlans(req.params.familyId) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

router.get('/:familyId/briefs/weekly', (req, res) => {
  try {
    res.json({ briefs: orchestratorEngine.getWeeklyBriefs(req.params.familyId) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

router.get('/:familyId/actions', (req, res) => {
  try {
    res.json({ actions: orchestratorEngine.listActions(req.params.familyId) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

router.post('/:familyId/actions/:actionId/complete', (req, res) => {
  try {
    const completed = orchestratorEngine.completeAction(req.params.familyId, req.params.actionId);

    if (completed) {
      orchestratorEngine.ingest({
        familyId: req.params.familyId,
        source: 'system',
        type: 'action_completed',
        payload: { actionId: req.params.actionId }
      });
    }

    res.json({ completed });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

// GET /api/orchestrator/:familyId/state
router.get('/:familyId/state', (req, res) => {
  try {
    const state = orchestratorEngine.getState(req.params.familyId);
    res.json(state);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

// GET /api/orchestrator/:familyId/signals
router.get('/:familyId/signals', (req, res) => {
  try {
    const signals = orchestratorEngine.getRecentSignals(req.params.familyId);
    res.json({ signals });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

export default router;
