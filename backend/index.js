/* eslint-env node */
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
import submissionsRouter from './routes/submissions.js';
import programsRouter from './routes/programs.js';
import coursesRouter from './routes/courses.js';
import incentivesRouter from './routes/incentives.js';
import contractsRouter from './routes/contracts.js';
import onboardingRouter from './routes/onboarding.js';
import adminRouter from './routes/partnerPortalAdmin.js';

app.use('/api/assignments', assignmentsRouter);
app.use('/api/submissions', submissionsRouter);
app.use('/api/programs', programsRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/incentives', incentivesRouter);
app.use('/api/contracts', contractsRouter);
app.use('/api/onboarding', onboardingRouter);
app.use('/api/admin', adminRouter);

// Start the server
app.listen(PORT, () => {
  console.log(`Teachmo backend server running on port ${PORT}`);
});
