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
// In-memory quiz data (with answers, not exposed directly)
const quizzes = [
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
];

// GET /api/quizzes
// Returns a list of sample quizzes with questions and options (no answers)
router.get('/', (req, res) => {
  // Remove answers before sending to client
  const quizzesWithoutAnswers = quizzes.map(quiz => ({
    id: quiz.id,
    title: quiz.title,
    questions: quiz.questions.map(q => ({
      id: q.id,
      prompt: q.prompt,
      options: q.options
    }))
  }));
  res.json(quizzesWithoutAnswers);
});

// POST /api/quizzes/:id/submit
// Accepts user answers and returns validation results
router.post('/:id/submit', (req, res) => {
  const quizId = parseInt(req.params.id, 10);
  const userAnswers = req.body.answers; // [{questionId: 1, answer: '4'}, ...]
  const quiz = quizzes.find(q => q.id === quizId);
  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found' });
  }
  const results = quiz.questions.map(q => {
    const userAnswer = userAnswers.find(a => a.questionId === q.id);
    return {
      questionId: q.id,
      correct: userAnswer ? userAnswer.answer === q.answer : false
    };
  });
  res.json({ results });
});
export default router;
