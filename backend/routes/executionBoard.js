/* eslint-env node */
import express from 'express';
import {
  ensureExecutionBoardReady,
  getExecutionBoard,
  updateEpic,
  updateSlice,
  createSlice,
  updateGate,
  createDependency,
  deleteDependency,
  getExecutionAudit,
  createOrchestratorAction,
  listOrchestratorActions
} from '../executionBoardDb.js';

const router = express.Router();

function requireInternalKey(req, res, next) {
  const required = process.env.INTERNAL_API_KEY;
  if (!required) return next();
  const provided = req.header('x-internal-key');
  if (provided && provided === required) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

function actorFromReq(req) {
  return req.header('x-execution-actor') || req.header('x-user') || req.header('x-actor') || 'unknown';
}

function toCsv(rows, columns) {
  const escape = (value) => {
    if (value === null || value === undefined) return '';
    const s = typeof value === 'string' ? value : JSON.stringify(value);
    const needsQuotes = /[",\n\r]/.test(s);
    const escaped = s.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
  };

  const header = columns.join(',');
  const lines = rows.map((row) => columns.map((col) => escape(row?.[col])).join(','));
  return [header, ...lines].join('\n');
}

router.use(requireInternalKey);

router.get('/board', async (req, res) => {
  const dbReady = await ensureExecutionBoardReady();
  if (!dbReady) {
    return res.status(503).json({ error: 'Execution board DB unavailable' });
  }
  const board = await getExecutionBoard();
  res.json(board);
});

router.patch('/epics/:id', async (req, res) => {
  const dbReady = await ensureExecutionBoardReady();
  if (!dbReady) return res.status(503).json({ error: 'Execution board DB unavailable' });

  const id = req.params.id;
  const patch = req.body || {};
  try {
    const updated = await updateEpic(id, patch, actorFromReq(req));
    if (!updated) return res.status(404).json({ error: 'Epic not found' });
    const board = await getExecutionBoard();
    res.json(board);
  } catch (err) {
    if (err?.code === 'WIP_LIMIT') {
      return res.status(409).json({ error: err.message });
    }
    console.error('Execution board epic update failed', err);
    res.status(500).json({ error: 'Failed to update epic' });
  }
});

router.post('/slices', async (req, res) => {
  const dbReady = await ensureExecutionBoardReady();
  if (!dbReady) return res.status(503).json({ error: 'Execution board DB unavailable' });

  const body = req.body || {};
  if (!body.id || !body.outcome) {
    return res.status(400).json({ error: 'id and outcome are required' });
  }
  const created = await createSlice(body, actorFromReq(req));
  if (!created) return res.status(409).json({ error: 'Slice already exists' });
  const board = await getExecutionBoard();
  res.json(board);
});

router.patch('/slices/:id', async (req, res) => {
  const dbReady = await ensureExecutionBoardReady();
  if (!dbReady) return res.status(503).json({ error: 'Execution board DB unavailable' });

  const id = req.params.id;
  const patch = req.body || {};
  const updated = await updateSlice(id, patch, actorFromReq(req));
  if (!updated) return res.status(404).json({ error: 'Slice not found' });
  const board = await getExecutionBoard();
  res.json(board);
});

router.patch('/gates/:gate', async (req, res) => {
  const dbReady = await ensureExecutionBoardReady();
  if (!dbReady) return res.status(503).json({ error: 'Execution board DB unavailable' });

  const gate = req.params.gate;
  const patch = req.body || {};
  const updated = await updateGate(gate, patch, actorFromReq(req));
  if (!updated) return res.status(404).json({ error: 'Gate not found' });
  const board = await getExecutionBoard();
  res.json(board);
});

router.post('/dependencies', async (req, res) => {
  const dbReady = await ensureExecutionBoardReady();
  if (!dbReady) return res.status(503).json({ error: 'Execution board DB unavailable' });

  const { fromEpic, toEpic, type = 'blocks', notes = '' } = req.body || {};
  if (!fromEpic || !toEpic) return res.status(400).json({ error: 'fromEpic and toEpic are required' });

  const created = await createDependency({ fromEpic, toEpic, type, notes }, actorFromReq(req));
  if (!created) return res.status(409).json({ error: 'Dependency already exists' });
  const board = await getExecutionBoard();
  res.json(board);
});

router.delete('/dependencies/:id', async (req, res) => {
  const dbReady = await ensureExecutionBoardReady();
  if (!dbReady) return res.status(503).json({ error: 'Execution board DB unavailable' });

  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });

  const ok = await deleteDependency(id, actorFromReq(req));
  if (!ok) return res.status(404).json({ error: 'Dependency not found' });
  const board = await getExecutionBoard();
  res.json(board);
});

router.get('/audit', async (req, res) => {
  const dbReady = await ensureExecutionBoardReady();
  if (!dbReady) return res.status(503).json({ error: 'Execution board DB unavailable' });

  const limit = req.query.limit ? Number(req.query.limit) : 200;
  const entity = req.query.entity ? String(req.query.entity) : undefined;
  const entityId = req.query.entityId ? String(req.query.entityId) : undefined;

  const rows = await getExecutionAudit({ limit, entity, entityId });
  res.json(rows);
});

router.post('/orchestrator-actions', async (req, res) => {
  const dbReady = await ensureExecutionBoardReady();
  if (!dbReady) return res.status(503).json({ error: 'Execution board DB unavailable' });

  const { actionType, entityType, entityId, payload } = req.body || {};
  if (!actionType || !entityType || !entityId) {
    return res.status(400).json({ error: 'actionType, entityType, entityId are required' });
  }

  const row = await createOrchestratorAction({
    actionType,
    entityType,
    entityId,
    payload,
    requestedBy: actorFromReq(req)
  });
  res.json({ action: row });
});

router.get('/orchestrator-actions', async (req, res) => {
  const dbReady = await ensureExecutionBoardReady();
  if (!dbReady) return res.status(503).json({ error: 'Execution board DB unavailable' });

  const limit = req.query.limit ? Number(req.query.limit) : 100;
  const rows = await listOrchestratorActions({ limit });
  res.json({ rows });
});

router.get('/export', async (req, res) => {
  const dbReady = await ensureExecutionBoardReady();
  if (!dbReady) return res.status(503).json({ error: 'Execution board DB unavailable' });

  const entity = String(req.query.entity || 'epics');
  const format = String(req.query.format || 'csv');
  if (format !== 'csv') return res.status(400).json({ error: 'Only csv supported' });

  const board = await getExecutionBoard();
  let csv = '';
  let filename = `teachmo_${entity}.csv`;

  if (entity === 'epics') {
    csv = toCsv(board.epics, ['id', 'workstream', 'tag', 'railSegment', 'ownerRole', 'status', 'blocked', 'gates', 'railPriority', 'nextMilestone', 'dod', 'notes']);
  } else if (entity === 'gates') {
    csv = toCsv(board.gates, ['gate', 'purpose', 'status', 'progress', 'ownerRole', 'dependsOn', 'targetWindow', 'checklist']);
  } else if (entity === 'slices') {
    csv = toCsv(board.slices, ['id', 'outcome', 'primaryEpic', 'gate', 'status', 'owner', 'dependsOn', 'inputs', 'deliverables', 'acceptance']);
  } else if (entity === 'dependencies') {
    csv = toCsv(board.dependencies, ['id', 'fromEpic', 'toEpic', 'type', 'notes']);
  } else {
    return res.status(400).json({ error: 'Unknown entity' });
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

export const executionBoardRouter = router;
export default router;
