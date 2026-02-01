/* eslint-env node */
import { createLogger } from './logger.js';

const logger = createLogger('env-check');

const REQUIRED_VARS = [
  'NHOST_ADMIN_SECRET',
  'NHOST_SUBDOMAIN',
  'NHOST_REGION',
  'AUTH_JWKS_URL'
];

export function performStartupCheck() {
  const isProd = process.env.NODE_ENV === 'production';
  const missing = [];
  
  REQUIRED_VARS.forEach((key) => {
    if (!process.env[key]) missing.push(key);
  });

  if (missing.length > 0) {
    logger.error('❌ FATAL: Missing required environment variables:', missing);
    if (isProd) {
      logger.error('Server cannot start in production without these variables.');
      process.exit(1);
    }
  }

  logger.info('✅ Environment configuration check passed.');
}
