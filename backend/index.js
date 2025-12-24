/* eslint-env node */
// Teachmo backend API entry point
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import assignmentsRouter from './routes/assignments.js';
import submissionsRouter from './routes/submissions.js';
import incentivesRouter from './routes/incentives.js';
import coursesRouter from './routes/courses.js';
import partnerPortalAdminRouter from './routes/partnerPortalAdmin.js';
import contractsRouter from './routes/contracts.js';
import onboardingRouter from './routes/onboarding.js';
import programsRouter from './routes/programs.js';
import faqsRouter from './routes/faqs.js';
import quizzesRouter from './routes/quizzes.js';
import learningPathsRouter from './routes/learningPaths.js';
import telemetryRouter from './routes/telemetry.js';
import { attachAuthContext } from './middleware/auth.js';
import analyticsRouter from './routes/analytics.js';
import tenantsRouter from './routes/tenants.js';
import aiRouter from './routes/ai.js';
import workflowsRouter from './routes/workflows.js';
import { seedDemoData } from './seed.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));
app.use(express.json());
app.use(attachAuthContext);

// Mount routes
app.use('/api/assignments', assignmentsRouter);
app.use('/api/submissions', submissionsRouter);
app.use('/api/incentives', incentivesRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/admin', partnerPortalAdminRouter);
app.use('/api/contracts', contractsRouter);
app.use('/api/onboarding', onboardingRouter);
app.use('/api/programs', programsRouter);
app.use('/api/faqs', faqsRouter);
app.use('/api/quizzes', quizzesRouter);
app.use('/api/learning-paths', learningPathsRouter);
app.use('/api/log', telemetryRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/tenants', tenantsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/workflows', workflowsRouter);

// Root endpoint to verify API is running
app.get('/api', (req, res) => {
  res.send({ message: 'Welcome to the Teachmo API' });
});

// Seed demo data so the dashboards have content
seedDemoData();
// Start the server
app.listen(PORT, () => {
  console.log(`Teachmo backend server running on port ${PORT}`);
});
