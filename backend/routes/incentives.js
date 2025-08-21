/* eslint-env node */
import { Router } from 'express';
import { incentives, incentiveApplications, nextId } from '../models.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(incentives);
});

router.post('/', (req, res) => {
  const { title, value, description } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const incentive = {
    id: nextId('incentive'),
    title,
    value: value || 0,
    description: description || '',
    status: 'active',
  };
  incentives.push(incentive);
  res.status(201).json(incentive);
});

router.post('/:id/apply', (req, res) => {
  const { id } = req.params;
  const { partnerId } = req.body;
  if (!partnerId) return res.status(400).json({ error: 'partnerId required' });
  const existing = incentiveApplications.find((a) => a.incentiveId === Number(id) && a.partnerId === partnerId);
  if (existing) return res.status(400).json({ error: 'already applied' });
  const app = {
    id: nextId('application'),
    incentiveId: Number(id),
    partnerId,
    status: 'pending',
    payout: null,
  };
  incentiveApplications.push(app);
  res.status(201).json(app);
});

router.get('/applications/:partnerId', (req, res) => {
  const { partnerId } = req.params;
  const apps = incentiveApplications.filter((a) => a.partnerId === partnerId);
  res.json(apps);
});

export default router;
