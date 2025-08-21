// API routes for interactive quizzes
import { Router } from 'express';

const router = Router();

// GET /api/quizzes
// Returns a list of sample quizzes with questions and options
router.get('/', (req, res) => {
  res.json([
    {
      id: 1,
      title: 'Fractions Basics Quiz',
      questions: [
        {
          id: 1,
          prompt: 'What is 1/2 of 8?',
          options: ['2', '4', '6', '8'],
          answer: '4'
        },
        {
          id: 2,
          prompt: 'Which fraction equals 0.25?',
          options: ['1/4', '1/2', '3/4', '4/5'],
          answer: '1/4'
        }
      ]
    }
  ]);
});

export default router;
