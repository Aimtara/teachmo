/* eslint-env node */
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  executionEpics,
  executionGates,
  executionSlices,
  executionDependencies,
} from '../models.js';
import { executionBoardSeed } from '../executionBoardSeedData.js';
import {
  epicPatchSchema,
  gatePatchSchema,
  slicePatchSchema,
} from '../validation/executionBoard.js';

function ensureSeeded() {
  if (executionEpics.length === 0) {
    executionEpics.push(...executionBoardSeed.epics);
  }
  if (executionGates.length === 0) {
    executionGates.push(...executionBoardSeed.gates);
  }
  if (executionSlices.length === 0) {
    executionSlices.push(...executionBoardSeed.slices);
  }
  if (executionDependencies.length === 0) {
    executionDependencies.push(...executionBoardSeed.dependencies);
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
  listOrchestratorActions,
  updateOrchestratorActionStatus
} from '../executionBoardDb.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.join(__dirname, '..', 'data', 'executionBoard.json');

let cache = null;
let cacheMtimeMs = 0;

function loadBoardSnapshot() {
  const stat = fs.statSync(DATA_PATH);
  if (!cache || stat.mtimeMs !== cacheMtimeMs) {
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    cache = JSON.parse(raw);
    cacheMtimeMs = stat.mtimeMs;
  }
  return cache;
}

function requireInternalKey(req, res, next) {
  const required = process.env.INTERNAL_API_KEY;
  if (!required) return next();
  const provided = req.header('x-internal-key');
  if (provided && provided === required) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

function enrichBoard() {
  const epicById = new Map(executionEpics.map((e) => [e.id, e]));

  const deps = executionDependencies.map((d) => ({
    ...d,
    fromStatus: epicById.get(d.from)?.status || 'Unknown',
    toStatus: epicById.get(d.to)?.status || 'Unknown',
  }));

  const blockedBy = new Map();
  deps.forEach((d) => {
    if (d.type !== 'blocks') return;
    if (d.fromStatus === 'Done') return;
    const list = blockedBy.get(d.to) || [];
    list.push(d.from);
    blockedBy.set(d.to, list);
  });
const publicSections = new Set([
  'epics',
  'gates',
  'slices',
  'dependencies',
  'metrics',
  'pilotMetrics',
  'decisionLog'
]);

function isPublicSnapshotRequest(req) {
  if (req.method !== 'GET') return false;
  if (req.path === '/') return true;
  const match = req.path.match(/^\/([^/]+)$/);
  if (!match) return false;
  return publicSections.has(match[1]);
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

router.use((req, res, next) => {
  if (isPublicSnapshotRequest(req)) return next();
  return requireInternalKey(req, res, next);
});

router.get('/', (req, res) => {
  try {
    const board = loadBoardSnapshot();
    res.json(board);
  } catch (err) {
    res.status(500).json({
      error: 'execution_board_unavailable',
      message: err.message
    });
  }
});

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

export const executionBoardRouter = express.Router();

// Protect all execution board routes with authentication and admin authorization.
executionBoardRouter.use(requireAuth);
executionBoardRouter.use(requireAdmin);
executionBoardRouter.get('/board', (req, res) => {
  res.json(enrichBoard());
});

executionBoardRouter.patch('/epics/:id', express.json(), (req, res) => {
  const { id } = req.params;
  const { idx, item } = findById(executionEpics, id);
  if (!item) return res.status(404).json({ error: 'Epic not found' });

  // Validate request body
  const validation = epicPatchSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.error.issues,
    });
  }

  const allowed = [
    'workstream',
    'tag',
    'railSegment',
    'ownerRole',
    'upstream',
    'downstream',
    'gates',
    'status',
    'nextMilestone',
    'dod',
    'notes',
    'epicKey',
    'railPriority',
  ];

  const patch = {};
  allowed.forEach((k) => {
    if (Object.prototype.hasOwnProperty.call(req.body || {}, k)) patch[k] = req.body[k];
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

router.post('/orchestrator-actions/:id/approve', async (req, res) => {
  const dbReady = await ensureExecutionBoardReady();
  if (!dbReady) return res.status(503).json({ error: 'Execution board DB unavailable' });

  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });

  const action = await updateOrchestratorActionStatus({
    id,
    status: 'approved',
    actor: actorFromReq(req)
  });

  if (!action) return res.status(404).json({ error: 'Action not found' });
  res.json({ action });
});

router.post('/orchestrator-actions/:id/execute', async (req, res) => {
  const dbReady = await ensureExecutionBoardReady();
  if (!dbReady) return res.status(503).json({ error: 'Execution board DB unavailable' });

  // Validate request body
  const validation = gatePatchSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.error.issues,
    });
  }

  const allowed = ['purpose', 'checklist', 'ownerRole', 'dependsOn', 'targetWindow', 'status'];
  const patch = {};
  allowed.forEach((k) => {
    if (Object.prototype.hasOwnProperty.call(req.body || {}, k)) patch[k] = req.body[k];
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });

  const action = await updateOrchestratorActionStatus({
    id,
    status: 'running',
    result: req.body?.result ?? null,
    actor: actorFromReq(req)
  });

  if (!action) return res.status(404).json({ error: 'Action not found' });
  res.json({ action });
});

router.post('/orchestrator-actions/:id/cancel', async (req, res) => {
  const dbReady = await ensureExecutionBoardReady();
  if (!dbReady) return res.status(503).json({ error: 'Execution board DB unavailable' });

  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });

  // Validate request body
  const validation = slicePatchSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.error.issues,
    });
  }

  const allowed = ['outcome', 'primaryEpic', 'gate', 'inputs', 'deliverables', 'acceptance', 'status', 'owner', 'storyKey', 'dependsOn'];
  const patch = {};
  allowed.forEach((k) => {
    if (Object.prototype.hasOwnProperty.call(req.body || {}, k)) patch[k] = req.body[k];
  const action = await updateOrchestratorActionStatus({
    id,
    status: 'canceled',
    actor: actorFromReq(req)
  });

  if (!action) return res.status(404).json({ error: 'Action not found' });
  res.json({ action });
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

router.get('/:section', (req, res) => {
  try {
    const board = loadBoardSnapshot();
    const { section } = req.params;
    const sectionMap = {
      epics: 'epics',
      gates: 'gates',
      slices: 'slices',
      dependencies: 'dependencies',
      metrics: 'pilotMetrics',
      pilotMetrics: 'pilotMetrics',
      decisionLog: 'decisionLog'
    };

    const key = sectionMap[section];
    if (!key) {
      return res.status(404).json({ error: 'not_found', message: 'Unknown section' });
    }

    res.json({ [key]: board[key], generatedAt: board.generatedAt, source: board.source });
  } catch (err) {
    res.status(500).json({
      error: 'execution_board_unavailable',
      message: err.message
    });
  }
});

export const executionBoardRouter = router;
export default router;
