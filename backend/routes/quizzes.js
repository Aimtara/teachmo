// API routes for interactive quizzes
import { Router } from 'express';

const router = Router();

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

const sanitizeQuiz = (quiz) => ({
  id: quiz.id,
  title: quiz.title,
  questions: quiz.questions.map((question) => ({
    id: question.id,
    prompt: question.prompt,
    options: question.options
  }))
});

// GET /api/quizzes
// Returns a list of sample quizzes with questions and options (no answers)
router.get('/', (req, res) => {
  res.json(quizzes.map(sanitizeQuiz));
});

// POST /api/quizzes/:id/submit
// Accepts user answers and returns validation results
router.post('/:id/submit', (req, res) => {
  const quizId = Number.parseInt(req.params.id, 10);
  const userAnswers = Array.isArray(req.body?.answers) ? req.body.answers : [];
  const quiz = quizzes.find((q) => q.id === quizId);

  if (!quiz) {
    return res.status(404).json({ error: 'Quiz not found' });
  }

  const results = quiz.questions.map((question) => {
    const userAnswer = userAnswers.find((answer) => answer.questionId === question.id);
    return {
      questionId: question.id,
      correct: Boolean(userAnswer && userAnswer.answer === question.answer)
    };
  });

  return res.json({ results });
});

export default router;
