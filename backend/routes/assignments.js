// API routes for assignment resources
import { Router } from 'express';
import { query } from '../db.js';

const router = Router();
const inMemoryAssignments = [];

// GET /api/assignments
// Fetch all assignments from the database
router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT id, title, description FROM assignments ORDER BY id'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching assignments', err);
    const fallbackResponse = inMemoryAssignments.map(({ id, title, description }) => ({ id, title, description }));
    res.json(fallbackResponse);
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
    const fallbackId = inMemoryAssignments.length + 1;
    const assignment = { id: fallbackId, title, description: description || '' };
    inMemoryAssignments.push(assignment);
    res.status(201).json(assignment);
  }
});

export default router;
