/* eslint-env node */
import { Router } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

const DATA_PATH = path.resolve(process.cwd(), 'backend', 'data', 'commandCenter.json');

const VALID_TYPES = ['RUNBOOK_CREATE', 'ESCALATE', 'ROLLBACK'];
const VALID_STATUS = ['queued', 'approved', 'running', 'done', 'failed', 'canceled'];

function ensureStore() {
  try {
    fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
    if (!fs.existsSync(DATA_PATH)) {
      fs.writeFileSync(
        DATA_PATH,
        JSON.stringify({ generatedAt: new Date().toISOString(), actions: [], audit: [] }, null, 2),
        'utf-8'
      );
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('commandCenter: failed to ensure store', err);
  }
}

function readStore() {
  ensureStore();
  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  const data = JSON.parse(raw);
  data.actions = Array.isArray(data.actions) ? data.actions : [];
  data.audit = Array.isArray(data.audit) ? data.audit : [];
  return data;
}

function writeStore(data) {
  ensureStore();
  const tmp = `${DATA_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmp, DATA_PATH);
}

function makeId(prefix = 'act') {
  const rnd = Math.random().toString(16).slice(2, 10);
  return `${prefix}_${Date.now()}_${rnd}`;
}

function nowIso() {
  return new Date().toISOString();
}

function appendAudit(store, event) {
  store.audit.unshift({
    id: makeId('aud'),
    ts: nowIso(),
    ...event
  });
  // Keep audit log bounded (local dev safety)
  if (store.audit.length > 5000) store.audit = store.audit.slice(0, 5000);
}

function sanitizeAction(action) {
  // Avoid leaking huge payloads in list view. Keep details endpoint for the full thing.
  const clone = { ...action };
  if (clone.payload && JSON.stringify(clone.payload).length > 2000) {
    clone.payload = { _truncated: true };
  }
  if (clone.result && JSON.stringify(clone.result).length > 2000) {
    clone.result = { _truncated: true };
  }
  if (clone.error && String(clone.error).length > 2000) {
    clone.error = String(clone.error).slice(0, 2000);
  }
  return clone;
}

function runStubExecutor(action) {
  // This is intentionally a stub. Hook this into the real orchestrator later.
  if (action.type === 'RUNBOOK_CREATE') {
    return {
      summary: 'Runbook created (stub)',
      runbook: {
        title: action.title || 'Untitled runbook',
        steps: [
          'Confirm scope + blast radius',
          'Check recent deploys',
          'Review metrics + logs',
          'Mitigate (rate-limit/cooldown/throttle)',
          'Communicate status update',
          'Postmortem notes'
        ]
      }
    };
  }

  if (action.type === 'ESCALATE') {
    return {
      summary: 'Escalation routed (stub)',
      routedTo: action.payload?.target || 'oncall',
      severity: action.payload?.severity || 'warn'
    };
  }

  if (action.type === 'ROLLBACK') {
    return {
      summary: 'Rollback executed (stub)',
      target: action.payload?.deployment || action.payload?.target || 'unknown',
      status: 'rolled_back'
    };
  }

  throw new Error(`Unknown type: ${action.type}`);
}

router.get('/actions', (req, res) => {
  try {
    const store = readStore();
    const { status, type, limit } = req.query;

    let actions = store.actions;
    if (status && VALID_STATUS.includes(status)) actions = actions.filter((a) => a.status === status);
    if (type && VALID_TYPES.includes(type)) actions = actions.filter((a) => a.type === type);

    actions = actions
      .slice()
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

    const lim = limit ? Number(limit) : 200;
    if (!Number.isNaN(lim) && lim > 0) actions = actions.slice(0, Math.min(lim, 1000));

    res.json({ actions: actions.map(sanitizeAction), generatedAt: store.generatedAt });
  } catch (err) {
    res.status(500).json({ error: 'command_center_unavailable', message: err.message });
  }
});

router.get('/actions/:id', (req, res) => {
  try {
    const store = readStore();
    const action = store.actions.find((a) => a.id === req.params.id);
    if (!action) return res.status(404).json({ error: 'not_found' });
    res.json({ action });
  } catch (err) {
    res.status(500).json({ error: 'command_center_unavailable', message: err.message });
  }
});

router.post('/actions', (req, res) => {
  try {
    const { type, title, payload, createdBy } = req.body || {};
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: 'invalid_type', validTypes: VALID_TYPES });
    }

    const store = readStore();
    const action = {
      id: makeId('act'),
      type,
      title: title || '',
      payload: payload ?? {},
      status: 'queued',
      createdBy: createdBy ?? null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      approvedBy: null,
      approvedAt: null,
      executedBy: null,
      executedAt: null,
      result: null,
      error: null
    };

    store.actions.unshift(action);
    store.generatedAt = nowIso();

    appendAudit(store, {
      actorId: createdBy ?? null,
      action: 'COMMAND_CENTER_ACTION_CREATED',
      entityType: 'command_center_action',
      entityId: action.id,
      metadata: { type: action.type, title: action.title }
    });

    writeStore(store);
    res.status(201).json({ action });
  } catch (err) {
    res.status(500).json({ error: 'command_center_unavailable', message: err.message });
  }
});

router.post('/actions/:id/approve', (req, res) => {
  try {
    const { actorId } = req.body || {};
    const store = readStore();
    const action = store.actions.find((a) => a.id === req.params.id);
    if (!action) return res.status(404).json({ error: 'not_found' });

    if (action.status !== 'queued') {
      return res.status(409).json({ error: 'invalid_transition', message: `Cannot approve from ${action.status}` });
    }

    action.status = 'approved';
    action.approvedBy = actorId ?? null;
    action.approvedAt = nowIso();
    action.updatedAt = nowIso();

    appendAudit(store, {
      actorId: actorId ?? null,
      action: 'COMMAND_CENTER_ACTION_APPROVED',
      entityType: 'command_center_action',
      entityId: action.id,
      metadata: { type: action.type }
    });

    store.generatedAt = nowIso();
    writeStore(store);
    res.json({ action });
  } catch (err) {
    res.status(500).json({ error: 'command_center_unavailable', message: err.message });
  }
});

router.post('/actions/:id/execute', (req, res) => {
  try {
    const { actorId } = req.body || {};
    const store = readStore();
    const action = store.actions.find((a) => a.id === req.params.id);
    if (!action) return res.status(404).json({ error: 'not_found' });

    if (!['approved', 'queued'].includes(action.status)) {
      return res.status(409).json({ error: 'invalid_transition', message: `Cannot execute from ${action.status}` });
    }

    action.status = 'running';
    action.executedBy = actorId ?? null;
    action.executedAt = nowIso();
    action.updatedAt = nowIso();

    appendAudit(store, {
      actorId: actorId ?? null,
      action: 'COMMAND_CENTER_ACTION_EXECUTE_STARTED',
      entityType: 'command_center_action',
      entityId: action.id,
      metadata: { type: action.type }
    });

    // Execute synchronously (stub)
    try {
      const result = runStubExecutor(action);
      action.status = 'done';
      action.result = result;
      action.error = null;

      appendAudit(store, {
        actorId: actorId ?? null,
        action: 'COMMAND_CENTER_ACTION_EXECUTE_DONE',
        entityType: 'command_center_action',
        entityId: action.id,
        metadata: { type: action.type }
      });
    } catch (execErr) {
      action.status = 'failed';
      action.error = execErr.message;

      appendAudit(store, {
        actorId: actorId ?? null,
        action: 'COMMAND_CENTER_ACTION_EXECUTE_FAILED',
        entityType: 'command_center_action',
        entityId: action.id,
        metadata: { type: action.type, error: execErr.message }
      });
    }

    action.updatedAt = nowIso();
    store.generatedAt = nowIso();
    writeStore(store);

    res.json({ action });
  } catch (err) {
    res.status(500).json({ error: 'command_center_unavailable', message: err.message });
  }
});

router.post('/actions/:id/cancel', (req, res) => {
  try {
    const { actorId, reason } = req.body || {};
    const store = readStore();
    const action = store.actions.find((a) => a.id === req.params.id);
    if (!action) return res.status(404).json({ error: 'not_found' });

    if (!['queued', 'approved', 'running'].includes(action.status)) {
      return res.status(409).json({ error: 'invalid_transition', message: `Cannot cancel from ${action.status}` });
    }

    action.status = 'canceled';
    action.updatedAt = nowIso();
    action.error = reason ? `Canceled: ${reason}` : action.error;

    appendAudit(store, {
      actorId: actorId ?? null,
      action: 'COMMAND_CENTER_ACTION_CANCELED',
      entityType: 'command_center_action',
      entityId: action.id,
      metadata: { type: action.type, reason: reason ?? null }
    });

    store.generatedAt = nowIso();
    writeStore(store);

    res.json({ action });
  } catch (err) {
    res.status(500).json({ error: 'command_center_unavailable', message: err.message });
  }
});

router.get('/audit', (req, res) => {
  try {
    const store = readStore();
    const limit = req.query.limit ? Number(req.query.limit) : 200;
    const items = store.audit.slice(0, Number.isNaN(limit) ? 200 : Math.min(limit, 1000));
    res.json({ audit: items, generatedAt: store.generatedAt });
  } catch (err) {
    res.status(500).json({ error: 'command_center_unavailable', message: err.message });
  }
});

export default router;
