/* eslint-env node */
import { Router } from 'express';
import { partnerContracts, nextId } from '../models.js';

const router = Router();

router.get('/', (req, res) => {
  const { partnerId } = req.query;
  const data = partnerId ? partnerContracts.filter((c) => c.partnerId === partnerId) : partnerContracts;
  res.json(data);
});

router.post('/', (req, res) => {
  const { partnerId, title, description } = req.body;
  if (!partnerId || !title) return res.status(400).json({ error: 'partnerId and title required' });
  const contract = {
    id: nextId('contract'),
    partnerId,
    title,
    description: description || '',
    status: 'pending',
  };
  partnerContracts.push(contract);
  res.status(201).json(contract);
});

export default router;
