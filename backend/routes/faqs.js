// API routes for frequently asked questions
import { Router } from 'express';

const router = Router();

// GET /api/faqs
// Returns a list of common support questions and answers
router.get('/', (req, res) => {
  res.json([
    {
      id: 1,
      question: 'How do I reset my password?',
      answer: 'Use the "Forgot Password" link on the login page and follow the instructions.'
    },
    {
      id: 2,
      question: 'Where can I find new activities?',
      answer: 'Browse the Activities section in the app for the latest curated content.'
    }
  ]);
});

export default router;
