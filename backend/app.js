/* eslint-env node */
// Teachmo backend API application (exportable for tests)
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
import scimRouter from './routes/scim.js';
import impersonationRouter from './routes/impersonation.js';
import { featureFlagsAdminRouter, featureFlagsRouter } from './routes/featureFlags.js';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
// CORS:
// - In production, never allow wildcard origins.
// - Prefer a comma-separated allowlist via ALLOWED_ORIGINS.
// - Fallback to localhost origins in dev.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const devFallbackOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000'
];

const corsOptions = {
  origin(origin, cb) {
    // Allow same-origin / server-to-server (no origin header).
    if (!origin) return cb(null, true);

    const env = (process.env.NODE_ENV || 'development').toLowerCase();
    const list = allowedOrigins.length ? allowedOrigins : (env === 'production' ? [] : devFallbackOrigins);

    if (list.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked for origin: ${origin}`));
  }
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(attachAuthContext);

// Mount routes
app.use('/api/assignments', assignmentsRouter);
app.use('/api/submissions', submissionsRouter);
app.use('/api/incentives', incentivesRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/admin', partnerPortalAdminRouter);
app.use('/api/admin', impersonationRouter);
app.use('/api/admin', complianceRouter);
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
app.use('/scim/v2', scimRouter);
app.use('/api/feature-flags', featureFlagsRouter);
app.use('/api/admin/feature-flags', featureFlagsAdminRouter);

// Root endpoint to verify API is running
app.get('/api', (req, res) => {
  res.send({ message: 'Welcome to the Teachmo API' });
});

export default app;
