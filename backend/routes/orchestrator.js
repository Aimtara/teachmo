/* eslint-env node */
import { Router } from 'express';
import crypto from 'crypto';
import { requireAuth, requireAuthOrService } from '../middleware/auth.js';
import { authorizeFamilyParam, authorizeFamilyBody } from '../middleware/authorizeFamily.js';
import { requireTenant } from '../middleware/tenant.js';
import { query } from '../db.js';
import { runOrchestrator } from '../orchestrator/orchestrator.js';
import { orchestratorEngine } from '../orchestrator/engine.js';
import { getFamilyHealth, getOrchestratorHealthSnapshot } from '../orchestrator/health.js';
import { OrchestratorStatePatchSchema } from '../orchestrator/state_patch.js';
import { orchestratorPgStore } from '../orchestrator/pgStore.js';
import { listAnomalies } from '../security/anomaly.js';
import redactPII from '../middleware/redactPII.js';
import {
  orchestratorPlans,
  orchestratorApprovals,
  orchestratorRuns,
  nextId
} from '../models.js';
import { planActionCatalog, resolveRollbackAction } from '../orchestrator/catalog.js';
import { listRunbooks, startRunbook, continueRunbook, listRunbookRuns } from '../orchestrator/runbooks.js';
import {
  listAlertRoutes,
  upsertAlertRoute,
  testAlertRoute,
  listEscalationPolicies,
  upsertEscalationPolicy,
  checkEscalations
} from '../orchestrator/alerts.js';
import { incrementOrchestratorCounter } from '../metrics.js';

const router = Router();

// Apply PII redaction middleware to all routes managed by this router.
// This ensures that any sensitive information contained in request bodies
// or error objects is redacted before reaching the logs.
router.use(redactPII());

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

router.get('/admin/audit', requireAuthOrService, async (req, res) => {
  try {
    if (!req.auth?.isService) return res.status(403).json({ error: 'service_key_required' });

    const limit = parseInt(req.query.limit ?? '100', 10);
    const eventType = req.query.eventType ? String(req.query.eventType) : null;

    const params = [];
    let where = 'WHERE 1=1';
    if (eventType) {
      params.push(eventType);
      where += ` AND event_type = $${params.length}`;
    }

    params.push(limit);

    const out = await query(
      `
      SELECT id, created_at, event_type, severity, user_id, family_id, ip, method, path, status_code, request_id, meta
      FROM security_audit_events
      ${where}
      ORDER BY created_at DESC
      LIMIT $${params.length}
      `,
      params
    );

    res.json({ events: out.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

// Create endpoint
router.post('/admin/alerts/endpoints', requireAuthOrService, async (req, res) => {
  try {
    if (!req.auth?.isService) return res.status(403).json({ error: 'service_key_required' });

    const { familyId, type, target, secret = null, enabled = true } = req.body || {};
    if (!familyId || !type || !target) return res.status(400).json({ error: 'missing_familyId_type_target' });

    const out = await query(
      `
      INSERT INTO orchestrator_alert_endpoints (family_id, type, target, secret, enabled)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, family_id, type, target, enabled, created_at
      `,
      [familyId, type, target, secret, Boolean(enabled)]
    );

    res.json({ endpoint: out.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

// List endpoints
router.get('/admin/alerts/endpoints', requireAuthOrService, async (req, res) => {
  try {
    if (!req.auth?.isService) return res.status(403).json({ error: 'service_key_required' });

    const familyId = req.query.familyId ? String(req.query.familyId) : null;
    const params = [];
    let where = 'WHERE 1=1';

    if (familyId) {
      params.push(familyId);
      where += ` AND family_id = $${params.length}`;
    }

    const out = await query(
      `
      SELECT id, family_id, type, target, enabled, created_at
      FROM orchestrator_alert_endpoints
      ${where}
      ORDER BY created_at DESC
      LIMIT 200
      `,
      params
    );

    res.json({ endpoints: out.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

// Disable endpoint
router.post('/admin/alerts/endpoints/:id/disable', requireAuthOrService, async (req, res) => {
  try {
    if (!req.auth?.isService) return res.status(403).json({ error: 'service_key_required' });

    const id = Number(req.params.id);
    await query(`UPDATE orchestrator_alert_endpoints SET enabled = false WHERE id = $1`, [id]);
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

// View deliveries
router.get('/admin/alerts/deliveries', requireAuthOrService, async (req, res) => {
  try {
    if (!req.auth?.isService) return res.status(403).json({ error: 'service_key_required' });

    const familyId = req.query.familyId ? String(req.query.familyId) : null;
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit ?? '100', 10)));

    const params = [];
    let where = 'WHERE 1=1';
    if (familyId) {
      params.push(familyId);
      where += ` AND family_id = $${params.length}`;
    }
    params.push(limit);

    const out = await query(
      `
      SELECT id, endpoint_id, family_id, anomaly_type, severity, status, response_code, created_at, dedupe_key
      FROM orchestrator_alert_deliveries
      ${where}
      ORDER BY created_at DESC
      LIMIT $${params.length}
      `,
      params
    );

    res.json({ deliveries: out.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

router.get('/admin/mitigations', requireAuthOrService, async (req, res) => {
  try {
    if (!req.auth?.isService) return res.status(403).json({ error: 'service_key_required' });

    const familyId = req.query.familyId ? String(req.query.familyId) : null;
    const params = [];
    let where = 'WHERE 1=1';
    if (familyId) {
      params.push(familyId);
      where += ` AND family_id = $${params.length}`;
    }

    const out = await query(
      `
      SELECT family_id, mitigation_type, active, activated_at, expires_at, last_updated, count, meta
      FROM orchestrator_mitigations
      ${where}
      ORDER BY last_updated DESC
      LIMIT 200
      `,
      params
    );

    res.json({ mitigations: out.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

const coerceSteps = (steps) => {
  if (Array.isArray(steps) && steps.length > 0) return steps;
  return planActionCatalog.map((action) => ({
    id: crypto.randomUUID(),
    type: action.type,
    title: action.description,
    params: {}
  }));
};

router.post('/plans', requireAuthOrService, async (req, res) => {
  const body = req.body || {};
  const steps = coerceSteps(body.steps);
  const plan = {
    id: crypto.randomUUID(),
    title: body.title || 'Orchestrator Plan',
    summary: body.summary || 'Auto-generated plan for mitigation and verification.',
    status: 'pending',
    createdAt: new Date().toISOString(),
    requestedBy: req.auth?.userId ?? body.requestedBy ?? null,
    steps
  };
  orchestratorPlans.push(plan);
  incrementOrchestratorCounter('plansCreated');

  const approval = {
    id: nextId('orchestratorApproval'),
    planId: plan.id,
    runbookRunId: null,
    status: 'pending',
    requestedAt: new Date().toISOString(),
    requestedBy: plan.requestedBy
  };
  orchestratorApprovals.push(approval);
  incrementOrchestratorCounter('approvalsRequested');

  res.status(201).json({ plan, approval });
});

router.get('/plans', requireAuthOrService, async (req, res) => {
  res.json({ plans: orchestratorPlans });
});

router.post('/plans/:id/approve', requireAuthOrService, async (req, res) => {
  const plan = orchestratorPlans.find((p) => p.id === req.params.id);
  if (!plan) return res.status(404).json({ error: 'plan_not_found' });

  const approved = Boolean(req.body?.approved);
  const approval = orchestratorApprovals.find((a) => a.planId === plan.id && a.status === 'pending');

  if (approval) {
    approval.status = approved ? 'approved' : 'rejected';
    approval.resolvedAt = new Date().toISOString();
    approval.resolvedBy = req.auth?.userId ?? null;
    incrementOrchestratorCounter(approved ? 'approvalsApproved' : 'approvalsRejected');
  }

  plan.status = approved ? 'approved' : 'rejected';
  plan.approvedAt = approved ? new Date().toISOString() : null;
  plan.rejectedAt = approved ? null : new Date().toISOString();
  plan.approvedBy = approved ? req.auth?.userId ?? null : null;

  res.json({ plan, approval });
});

router.post('/plans/:id/execute', requireAuthOrService, async (req, res) => {
  const plan = orchestratorPlans.find((p) => p.id === req.params.id);
  if (!plan) return res.status(404).json({ error: 'plan_not_found' });
  if (plan.status !== 'approved') {
    return res.status(409).json({ error: 'plan_not_approved' });
  }

  const preHealth = getOrchestratorHealthSnapshot('pre');
  const verifyOk = req.body?.verifyOk ?? true;
  const run = {
    id: crypto.randomUUID(),
    planId: plan.id,
    status: 'completed',
    createdAt: new Date().toISOString(),
    executedBy: req.auth?.userId ?? null,
    steps: plan.steps,
    preHealth,
    postHealth: getOrchestratorHealthSnapshot('post'),
    verify: {
      ok: Boolean(verifyOk),
      checkedAt: new Date().toISOString()
    }
  };

  orchestratorRuns.push(run);
  plan.status = 'executed';
  plan.executedAt = run.createdAt;
  plan.runId = run.id;
  incrementOrchestratorCounter('plansExecuted');
  incrementOrchestratorCounter(verifyOk ? 'planRunsVerified' : 'planRunsFailed');

  res.json({ run, plan });
});

router.get('/approvals', requireAuthOrService, async (req, res) => {
  const status = req.query.status ? String(req.query.status) : null;
  const approvals = status
    ? orchestratorApprovals.filter((a) => a.status === status)
    : orchestratorApprovals;
  res.json({ approvals });
});

router.post('/runs/:id/rollback', requireAuthOrService, async (req, res) => {
  const run = orchestratorRuns.find((r) => r.id === req.params.id);
  if (!run) return res.status(404).json({ error: 'run_not_found' });

  const rollbackActions = run.steps
    .map((step) => {
      const rollbackType = resolveRollbackAction(step.type);
      if (!rollbackType) return null;
      return {
        id: crypto.randomUUID(),
        type: rollbackType,
        sourceStepId: step.id,
        createdAt: new Date().toISOString()
      };
    })
    .filter(Boolean);

  run.rollback = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    actions: rollbackActions,
    status: 'completed'
  };
  run.status = 'rolled_back';
  incrementOrchestratorCounter('rollbacksCreated');

  res.json({ run });
});

router.get('/runbooks', requireAuthOrService, async (req, res) => {
  res.json({ runbooks: listRunbooks() });
});

router.post('/runbooks/:key/start', requireAuthOrService, async (req, res) => {
  const run = startRunbook(req.params.key, req.auth?.userId ?? null);
  if (!run) return res.status(404).json({ error: 'runbook_not_found' });
  res.json({ run });
});

router.post('/runbook-runs/:id/continue', requireAuthOrService, async (req, res) => {
  const run = continueRunbook(req.params.id, {
    approved: req.body?.approved ?? true,
    actor: req.auth?.userId ?? null
  });
  if (!run) return res.status(404).json({ error: 'runbook_run_not_found' });
  res.json({ run });
});

router.get('/runbook-runs', requireAuthOrService, async (req, res) => {
  res.json({ runs: listRunbookRuns() });
});

router.get('/alert-routes', requireAuthOrService, async (req, res) => {
  res.json({ routes: listAlertRoutes() });
});

router.post('/alert-routes', requireAuthOrService, async (req, res) => {
  const result = upsertAlertRoute(req.body || {});
  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
});

router.post('/alert-routes/:id/test', requireAuthOrService, async (req, res) => {
  const result = testAlertRoute(req.params.id, req.body || {});
  if (result.error) return res.status(404).json({ error: result.error });
  res.json(result);
});

router.get('/escalation-policies', requireAuthOrService, async (req, res) => {
  res.json({ policies: listEscalationPolicies() });
});

router.post('/escalation-policies', requireAuthOrService, async (req, res) => {
  const result = upsertEscalationPolicy(req.body || {});
  res.json(result);
});

router.post('/escalations/check', requireAuthOrService, async (req, res) => {
  res.json(checkEscalations(req.body || {}));
});

router.use('/:familyId', requireAuthOrService, authorizeFamilyParam('familyId'));

router.get('/:familyId/health', async (req, res) => {
  try {
    const days = parseInt(req.query.days ?? '14', 10);
    const hourly = req.query.hourly === '1' || req.query.hourly === 'true';
    const hourlyHours = parseInt(req.query.hourlyHours ?? '24', 10);

    const health = await getFamilyHealth(req.params.familyId, { days, hourly, hourlyHours });
    res.json(health);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

router.get('/:familyId/anomalies', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit ?? '50', 10);
    const offset = parseInt(req.query.offset ?? '0', 10);
    const anomalies = await listAnomalies(req.params.familyId, { limit, offset });
    res.json({ anomalies });
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
