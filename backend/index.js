// Teachmo backend API entry point
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Root endpoint to verify API is running
app.get('/api', (req, res) => {
  res.send({ message: 'Welcome to the Teachmo API' });
});

// Import and mount API routes
import assignmentsRouter from './routes/assignments.js';
import learningPathsRouter from './routes/learningPaths.js';
import quizzesRouter from './routes/quizzes.js';
import faqsRouter from './routes/faqs.js';
app.use('/api/assignments', assignmentsRouter);
app.use('/api/learning-paths', learningPathsRouter);
app.use('/api/quizzes', quizzesRouter);
app.use('/api/faqs', faqsRouter);

// Start the server
app.listen(PORT, () => {
  console.log(`Teachmo backend server running on port ${PORT}`);
});