// API routes for assignment resources
import { Router } from 'express';

const router = Router();

// GET /api/assignments
// Returns a simple list of sample assignments
router.get('/', (req, res) => {
  res.json([
    { id: 1, title: 'Sample Assignment', description: 'This is a sample assignment.' }
  ]);
});

// POST /api/assignments
// Creates a new assignment (in-memory only for now)
router.post('/', (req, res) => {
  const { title, description } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }
  const newAssignment = {
    id: Date.now(),
    title,
    description: description || ''
  };
  // In a real application, you would persist to a database here
  res.status(201).json(newAssignment);
});

export default router;