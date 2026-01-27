/* eslint-env node */
import express from 'express';
import {
  createConnection,
  getMaskedToken,
  listConnections,
  saveToken,
  refreshToken,
  ensureValidToken,
} from '../integrations/oauth.js';
import { createIamRule, listIamRules, updateIamRule } from '../integrations/iam.js';
import {
  createRosterSource,
  listRosterSources,
  listRosterRuns,
  listRosterUsers,
  runRosterSync,
  retryRosterRun,
  findRosterRun,
} from '../integrations/rosterSync.js';
import { listAlerts } from '../integrations/alerts.js';

const router = express.Router();

router.get('/connections', (req, res) => {
  res.json(listConnections());
});

router.post('/connections', (req, res) => {
  try {
    const connection = createConnection(req.body || {});
    res.status(201).json(connection);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/connections/:id/token', (req, res) => {
  const token = getMaskedToken(req.params.id);
  if (!token) {
    res.status(404).json({ error: 'Token not found' });
    return;
  }
  res.json(token);
});

router.post('/connections/:id/token', (req, res) => {
  try {
    const token = saveToken(req.params.id, req.body || {});
    res.status(201).json(token);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/connections/:id/refresh', (req, res) => {
  try {
    const token = refreshToken(req.params.id);
    res.json(token);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/connections/:id/ensure', (req, res) => {
  try {
    const token = ensureValidToken(req.params.id);
    res.json(token);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/iam/rules', (req, res) => {
  res.json(listIamRules());
});

router.post('/iam/rules', (req, res) => {
  try {
    const rule = createIamRule(req.body || {});
    res.status(201).json(rule);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/iam/rules/:id', (req, res) => {
  try {
    const rule = updateIamRule(req.params.id, req.body || {});
    res.json(rule);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

router.get('/roster/sources', (req, res) => {
  res.json(listRosterSources());
});

router.post('/roster/sources', (req, res) => {
  try {
    const source = createRosterSource(req.body || {});
    res.status(201).json(source);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/roster/sources/:id/sync', (req, res) => {
  try {
    const run = runRosterSync({
      sourceId: req.params.id,
      records: req.body?.records || [],
      options: req.body?.options || {},
      simulateFailure: Boolean(req.body?.simulateFailure),
      triggeredBy: req.body?.triggeredBy || 'manual',
    });
    res.json(run);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/roster/runs', (req, res) => {
  const sourceId = req.query.sourceId;
  if (!sourceId) {
    res.status(400).json({ error: 'sourceId is required' });
    return;
  }
  res.json(listRosterRuns(sourceId));
});

router.get('/roster/runs/:id', (req, res) => {
  const run = findRosterRun(req.params.id);
  if (!run) {
    res.status(404).json({ error: 'Run not found' });
    return;
  }
  res.json(run);
});

router.post('/roster/runs/:id/retry', (req, res) => {
  try {
    const run = retryRosterRun(req.params.id);
    res.json(run);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

router.get('/roster/users', (req, res) => {
  const sourceId = req.query.sourceId;
  if (!sourceId) {
    res.status(400).json({ error: 'sourceId is required' });
    return;
  }
  res.json(listRosterUsers(sourceId));
});

router.get('/roster/alerts', (req, res) => {
  res.json(listAlerts());
});

export default router;
