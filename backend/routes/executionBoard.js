/* eslint-env node */

import express from 'express';
import {
  addDependency,
  createOrchestratorAction,
  deleteSlice,
  ensureExecutionBoardTables,
  getExecutionBoard,
  listAudit,
  listOrchestratorActions,
  removeDependency,
  seedExecutionBoardIfEmpty,
  toCsv,
  updateEpic,
  updateGate,
  upsertSlice
} from '../executionBoard/db.js';

const router = express.Router();

function requireInternalKey(req, res, next) {
  const expected = process.env.INTERNAL_API_KEY;
  if (!expected) return next();

  const provided = req.header('x-internal-key');
  if (provided && provided === expected) return next();

  res.status(401).send({ error: 'Unauthorized (missing/invalid x-internal-key)' });
}

function getActor(req) {
  return req.header('x-actor') || 'unknown';
}

async function ensureReady(req, res, next) {
  try {
    await ensureExecutionBoardTables();
    await seedExecutionBoardIfEmpty();
    next();
  } catch (err) {
    console.error('ExecutionBoard init error', err);
    res.status(500).send({ error: 'ExecutionBoard unavailable. Check DB env + Postgres.' });
  }
}

router.use(requireInternalKey);
router.use(ensureReady);

router.get('/board', async (req, res) => {
  const board = await getExecutionBoard();
  res.send(board);
});

router.patch('/epics/:id', async (req, res) => {
  const id = req.params.id;
  const actor = getActor(req);
  const updated = await updateEpic(id, req.body ?? {}, actor);
  if (!updated) return res.status(404).send({ error: 'Epic not found' });
  const board = await getExecutionBoard();
  res.send(board);
});

router.patch('/gates/:gate', async (req, res) => {
  const gate = req.params.gate;
  const actor = getActor(req);
  const updated = await updateGate(gate, req.body ?? {}, actor);
  if (!updated) return res.status(404).send({ error: 'Gate not found' });
  const board = await getExecutionBoard();
  res.send(board);
});

router.post('/slices', async (req, res) => {
  const actor = getActor(req);
  const { id, ...patch } = req.body ?? {};
  if (!id) return res.status(400).send({ error: 'id required' });
  const updated = await upsertSlice(id, patch, actor);
  const board = await getExecutionBoard();
  res.send({ updated, board });
});

router.patch('/slices/:id', async (req, res) => {
  const actor = getActor(req);
  const id = req.params.id;
  const updated = await upsertSlice(id, req.body ?? {}, actor);
  const board = await getExecutionBoard();
  res.send({ updated, board });
});

router.delete('/slices/:id', async (req, res) => {
  const actor = getActor(req);
  const ok = await deleteSlice(req.params.id, actor);
  const board = await getExecutionBoard();
  res.send({ ok, board });
});

router.post('/dependencies', async (req, res) => {
  const actor = getActor(req);
  const dep = req.body ?? {};
  if (!dep.fromKind || !dep.fromId || !dep.toKind || !dep.toId) {
    return res.status(400).send({ error: 'fromKind/fromId/toKind/toId required' });
  }
  await addDependency(dep, actor);
  const board = await getExecutionBoard();
  res.send(board);
});

router.delete('/dependencies/:id', async (req, res) => {
  const actor = getActor(req);
  const ok = await removeDependency(Number(req.params.id), actor);
  const board = await getExecutionBoard();
  res.send({ ok, board });
});

router.get('/audit', async (req, res) => {
  const { entityType, entityId } = req.query;
  const limit = req.query.limit ? Number(req.query.limit) : 200;
  const rows = await listAudit({
    limit: Number.isFinite(limit) ? limit : 200,
    entityType: entityType ? String(entityType) : undefined,
    entityId: entityId ? String(entityId) : undefined
  });
  res.send({ rows });
});

router.post('/orchestrator-actions', async (req, res) => {
  const requestedBy = getActor(req);
  const { actionType, entityType, entityId, payload } = req.body ?? {};
  if (!actionType || !entityType || !entityId) {
    return res.status(400).send({ error: 'actionType/entityType/entityId required' });
  }
  const row = await createOrchestratorAction({ actionType, entityType, entityId, payload, requestedBy });
  res.send({ action: row });
});

router.get('/orchestrator-actions', async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 100;
  const rows = await listOrchestratorActions({ limit: Number.isFinite(limit) ? limit : 100 });
  res.send({ rows });
});

router.get('/export', async (req, res) => {
  const entity = String(req.query.entity || 'epics');
  const format = String(req.query.format || 'csv');
  const board = await getExecutionBoard();
  if (format !== 'csv') return res.status(400).send({ error: 'Only csv supported' });

  let csv = '';
  let filename = `teachmo_${entity}.csv`;

  if (entity === 'epics') {
    csv = toCsv(board.epics, ['id', 'workstream', 'tag', 'railSegment', 'ownerRole', 'status', 'blocked', 'blockers', 'gates', 'railPriority', 'dod', 'notes']);
  } else if (entity === 'gates') {
    csv = toCsv(board.gates, ['gate', 'purpose', 'status', 'progress', 'checklist', 'updatedAt']);
  } else if (entity === 'slices') {
    csv = toCsv(board.slices, ['id', 'name', 'status', 'ownerRole', 'gate', 'primaryEpicId', 'summary', 'acceptance', 'updatedAt']);
  } else if (entity === 'dependencies') {
    csv = toCsv(board.dependencies, ['id', 'fromKind', 'fromId', 'toKind', 'toId', 'relation', 'createdAt']);
  } else {
    return res.status(400).send({ error: 'Unknown entity' });
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

export const executionBoardRouter = router;
export default router;
