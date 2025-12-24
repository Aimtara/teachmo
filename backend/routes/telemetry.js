/* eslint-env node */
import { Router } from 'express';
import { telemetryLogs, nextId } from '../models.js';

const router = Router();

router.post('/telemetry', (req, res) => {
  const { event, metadata } = req.body || {};
  if (!event) {
    return res.status(400).json({ error: 'event required' });
  }

  const entry = {
    id: nextId('telemetry'),
    event,
    metadata: metadata || {},
    createdAt: new Date().toISOString(),
  };
  telemetryLogs.push(entry);
  return res.status(201).json(entry);
});

export default router;
