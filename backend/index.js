/* eslint-env node */
// Teachmo backend API entry point
import dotenv from 'dotenv';
import app from './app.js';
import { seedDemoData } from './seed.js';
import { startRetentionPurgeScheduler } from './jobs/retentionPurge.js';
import { startNotificationQueueScheduler } from './jobs/notificationQueue.js';
import { startObservabilitySchedulers } from './jobs/observabilityScheduler.js';
import { startRosterSyncScheduler } from './jobs/rosterSyncScheduler.js';
import { createLogger } from './utils/logger.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 4000;
const logger = createLogger('server');

// Seed demo data ONLY when explicitly enabled.
// Never seed in production.
const shouldSeedDemo =
  String(process.env.ENABLE_DEMO_SEED || '').toLowerCase() === 'true' &&
  (process.env.NODE_ENV || 'development').toLowerCase() !== 'production';

if (shouldSeedDemo) {
  seedDemoData();
}
startRetentionPurgeScheduler();
startNotificationQueueScheduler();
startObservabilitySchedulers();
startRosterSyncScheduler();
// Start the server
app.listen(PORT, () => {
  logger.info(`Teachmo backend server running on port ${PORT}`);
});
