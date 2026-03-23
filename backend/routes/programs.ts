import { Router } from 'express';
import { nextId, partnerPrograms } from '../models.js';

const router = Router();

type ProgramRequestBody = {
  title?: string;
  description?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
};

// list programs
router.get('/', (_req, res) => {
  res.json(partnerPrograms);
});

// create program (admin)
router.post('/', (req, res) => {
  const { title, description, category, startDate, endDate } = req.body as ProgramRequestBody;
  if (!title) return res.status(400).json({ error: 'title required' });
  const program = {
    id: nextId('program'),
    title,
    description: description || '',
    category: category || 'general',
    startDate: startDate || null,
    endDate: endDate || null,
    status: 'active'
  };
  partnerPrograms.push(program);
  res.status(201).json(program);
});

export default router;
