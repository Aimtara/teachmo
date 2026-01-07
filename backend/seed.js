/* eslint-env node */
import { createLogger } from './utils/logger.js';

const logger = createLogger('seed');

export function seedDemoData() {
  if (process.env.SEED_DEMO_DATA !== 'true') {
    return;
  }

  logger.warn('Demo seeding is disabled for database-backed partner portal data.');
}
