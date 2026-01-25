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
  getExecutionAudit
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
  const updated = await updateEpic(id, patch, actorFromReq(req));
  if (!updated) return res.status(404).json({ error: 'Epic not found' });
  const board = await getExecutionBoard();
  res.json(board);
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

export const executionBoardRouter = router;
export default router;
