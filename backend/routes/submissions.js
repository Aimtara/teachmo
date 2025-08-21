/* eslint-env node */
import { Router } from 'express';
import { partnerSubmissions, nextId } from '../models.js';

const router = Router();

// GET /api/submissions
// Returns all submissions
router.get('/', (req, res) => {
  res.json(partnerSubmissions);
});

// POST /api/submissions
// Creates a new submission with status pending
router.post('/', (req, res) => {
  const { type, title, description } = req.body;
  if (!type || !title) {
    return res.status(400).json({ error: 'type and title are required' });
  }
  const submission = {
    id: nextId('submission'),
    type,
    title,
    description: description || '',
    status: 'pending',
  };
  partnerSubmissions.push(submission);
  res.status(201).json(submission);
});

// edit draft submission
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const submission = partnerSubmissions.find((s) => s.id === Number(id));
  if (!submission) return res.status(404).json({ error: 'not found' });
  if (submission.status !== 'pending') return res.status(400).json({ error: 'only pending editable' });
  const { title, description } = req.body;
  if (title) submission.title = title;
  if (description) submission.description = description;
  res.json(submission);
});
export default router;
