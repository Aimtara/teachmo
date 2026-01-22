/* eslint-env node */
import { Router } from 'express';
import crypto from 'crypto';
import { requireAuth, requireAuthOrService } from '../middleware/auth.js';
import { authorizeFamilyParam, authorizeFamilyBody } from '../middleware/authorizeFamily.js';
import { requireTenant } from '../middleware/tenant.js';
import { query } from '../db.js';
import { runOrchestrator } from '../orchestrator/orchestrator.js';
import { orchestratorEngine } from '../orchestrator/engine.js';
import { OrchestratorStatePatchSchema } from '../orchestrator/state_patch.js';
import { orchestratorPgStore } from '../orchestrator/pgStore.js';

const router = Router();

router.post('/route', requireAuth, requireTenant, async (req, res) => {
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
router.post('/signal', requireAuthOrService, authorizeFamilyBody('familyId'), async (req, res) => {
  try {
    const headerKey = req.get('Idempotency-Key');
    if (headerKey && !req.body.idempotencyKey) {
      req.body.idempotencyKey = headerKey;
    }

    const decision = await orchestratorEngine.ingest(req.body);
    res.json(decision);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

router.post('/admin/memberships', requireAuthOrService, async (req, res) => {
  try {
    if (!req.auth?.isService) return res.status(403).json({ error: 'service_key_required' });

    const { familyId, userId, role = 'parent' } = req.body || {};
    if (!familyId || !userId) return res.status(400).json({ error: 'missing_familyId_or_userId' });

    await query(
      `INSERT INTO family_memberships(family_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (family_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
      [familyId, userId, role]
    );

    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

router.use('/:familyId', requireAuthOrService, authorizeFamilyParam('familyId'));

router.post('/:familyId/run-daily', async (req, res) => {
  try {
    const plan = await orchestratorEngine.runDaily(req.params.familyId);
    res.json(plan);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

router.get('/:familyId/traces', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit ?? '50', 10);
    const offset = parseInt(req.query.offset ?? '0', 10);
    const triggerType = req.query.triggerType ? String(req.query.triggerType) : null;

    const traces = await orchestratorPgStore.listDecisionTraces(req.params.familyId, {
      limit,
      offset,
      triggerType
    });
    res.json({ traces });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

router.get('/:familyId/traces/:traceId', async (req, res) => {
  try {
    const trace = await orchestratorPgStore.getDecisionTrace(req.params.familyId, Number(req.params.traceId));
    if (!trace) return res.status(404).json({ error: 'trace_not_found' });
    res.json(trace);
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

router.get('/:familyId/actions', async (req, res) => {
  try {
    const status = req.query.status ?? 'queued';
    const limit = parseInt(req.query.limit ?? '50', 10);
    const offset = parseInt(req.query.offset ?? '0', 10);

    const actions = await orchestratorPgStore.listActions(req.params.familyId, { status, limit, offset });
    res.json({ actions });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

router.post('/:familyId/actions/:actionId/complete', async (req, res) => {
  try {
    const completed = await orchestratorPgStore.completeAction(
      req.params.familyId,
      req.params.actionId,
      { source: 'api' }
    );

    if (completed) {
      await orchestratorEngine.ingest({
        familyId: req.params.familyId,
        source: 'system',
        type: 'action_completed',
        idempotencyKey: `action_completed:${req.params.actionId}`,
        payload: { actionId: req.params.actionId }
      });
    }

    res.json({ completed });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

router.post('/:familyId/actions/:actionId/dismiss', async (req, res) => {
  try {
    const dismissed = await orchestratorPgStore.dismissAction(
      req.params.familyId,
      req.params.actionId,
      { source: 'api' }
    );
    res.json({ dismissed });
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
