// API routes for learning paths
import { Router } from 'express';

const router = Router();

// GET /api/learning-paths
// Returns a list of sample multi-stage learning journeys
router.get('/', (req, res) => {
  res.json([
    {
      id: 1,
      name: 'Intro to Fractions',
      skill: 'Fractions',
      stages: [
        { id: 1, title: 'Understanding Halves', type: 'activity' },
        { id: 2, title: 'Quarters and Eighths', type: 'activity' },
        { id: 3, title: 'Quiz: Fractions Basics', type: 'quiz' }
      ]
    }
  ]);
});

export default router;
