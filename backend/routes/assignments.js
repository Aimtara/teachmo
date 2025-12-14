// API routes for assignment resources
import { Router } from 'express';
import { query } from '../db.js';

const fallbackAssignments = [
  { id: 1, title: 'Reading log', description: 'Track 20 minutes of reading' },
  { id: 2, title: 'STEM challenge', description: 'Build a bridge from household items' }
];

const router = Router();

// GET /api/assignments
// Fetch all assignments from the database
router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT id, title, description FROM assignments ORDER BY id'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching assignments, returning seed data', err);
    res.status(200).json(fallbackAssignments);
  }
});

// POST /api/assignments
// Create a new assignment and persist it to the database
router.post('/', async (req, res) => {
  const { title, description } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const result = await query(
      'INSERT INTO assignments (title, description) VALUES ($1, $2) RETURNING id, title, description',
      [title, description || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating assignment', err);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

export default router;
