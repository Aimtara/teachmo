/* eslint-env node */
import { Router } from 'express';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { runOrchestrator } from '../orchestrator/orchestrator.js';
import { orchestratorEngine } from '../orchestrator/engine.js';
import { OrchestratorStatePatchSchema } from '../orchestrator/state_patch.js';
import { orchestratorPgStore } from '../orchestrator/pgStore.js';

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
router.post('/signal', async (req, res) => {
  try {
    const decision = await orchestratorEngine.ingest(req.body);
    res.json(decision);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

router.post('/:familyId/run-daily', async (req, res) => {
  try {
    const plan = await orchestratorEngine.runDaily(req.params.familyId);
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

router.get('/:familyId/digest', async (req, res) => {
  try {
    const status = req.query.status ?? 'queued';
    const limit = parseInt(req.query.limit ?? '50', 10);
    const offset = parseInt(req.query.offset ?? '0', 10);
    const digest = await orchestratorEngine.getDigest(req.params.familyId, { status, limit, offset });
    res.json({ digest });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

router.post('/:familyId/digest/mark-delivered', async (req, res) => {
  try {
    const digest = await orchestratorEngine.markDigestDelivered(req.params.familyId);
    res.json({ digest });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

router.post('/:familyId/digest/:itemId/dismiss', async (req, res) => {
  try {
    const dismissed = await orchestratorEngine.dismissDigestItem(req.params.familyId, req.params.itemId);
    res.json({ dismissed });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

router.get('/:familyId/plans/daily', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit ?? '10', 10);
    const offset = parseInt(req.query.offset ?? '0', 10);
    const plans = await orchestratorEngine.getDailyPlans(req.params.familyId, { limit, offset });
    res.json({ plans });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

router.get('/:familyId/plans/daily/latest', async (req, res) => {
  try {
    const plan = await orchestratorEngine.getLatestDailyPlan(req.params.familyId);
    if (!plan) return res.status(404).json({ error: 'no_daily_plan' });
    res.json(plan);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

router.get('/:familyId/briefs/weekly', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit ?? '10', 10);
    const offset = parseInt(req.query.offset ?? '0', 10);
    const briefs = await orchestratorEngine.getWeeklyBriefs(req.params.familyId, { limit, offset });
    res.json({ briefs });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

router.get('/:familyId/briefs/weekly/latest', async (req, res) => {
  try {
    const brief = await orchestratorEngine.getLatestWeeklyBrief(req.params.familyId);
    if (!brief) return res.status(404).json({ error: 'no_weekly_brief' });
    res.json(brief);
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

router.post('/:familyId/actions/:actionId/complete', async (req, res) => {
  try {
    const completed = orchestratorEngine.completeAction(req.params.familyId, req.params.actionId);

    if (completed) {
      await orchestratorEngine.ingest({
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
router.get('/:familyId/state', async (req, res) => {
  try {
    const state = await orchestratorEngine.getState(req.params.familyId);
    res.json(state);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

router.patch('/:familyId/state', async (req, res) => {
  try {
    const patch = OrchestratorStatePatchSchema.parse(req.body);
    const current = await orchestratorEngine.getState(req.params.familyId);

    const next = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString()
    };

    await orchestratorPgStore.upsertState(next);
    orchestratorEngine.store.setState(req.params.familyId, next, new Date());

    res.json(next);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

// GET /api/orchestrator/:familyId/signals
router.get('/:familyId/signals', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit ?? '200', 10);
    const offset = parseInt(req.query.offset ?? '0', 10);
    const sinceDays = req.query.sinceDays ? parseInt(req.query.sinceDays, 10) : null;

    const sinceIso =
      sinceDays && Number.isFinite(sinceDays)
        ? new Date(Date.now() - sinceDays * 24 * 3600 * 1000).toISOString()
        : null;

    const signals = await orchestratorPgStore.listSignals(req.params.familyId, { sinceIso, limit, offset });
    res.json({ signals });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

export default router;
