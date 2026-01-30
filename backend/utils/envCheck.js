/* eslint-env node */
import { createLogger } from './logger.js';

const logger = createLogger('env-check');

const REQUIRED_VARS = [
  'NHOST_ADMIN_SECRET',
  'NHOST_SUBDOMAIN',
  'NHOST_REGION',
  'AUTH_JWKS_URL'
];

const INTEGRATION_VARS = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'OPENAI_API_KEY'
];

export function performStartupCheck() {
  const isProd = process.env.NODE_ENV === 'production';
  const missing = [];
  const warnings = [];

  // Critical Core
  REQUIRED_VARS.forEach((key) => {
    if (!process.env[key]) missing.push(key);
  });

  // Integrations (Warn only in dev, Error in Prod if critical)
  INTEGRATION_VARS.forEach((key) => {
    if (!process.env[key]) warnings.push(key);
  });

  if (missing.length > 0) {
    logger.error('❌ FATAL: Missing required environment variables:', missing);
    if (isProd) {
      logger.error('Server cannot start in production without these variables.');
      process.exit(1);
    }
  }

  if (warnings.length > 0) {
    if (isProd) {
      logger.warn('⚠️  WARNING: Missing integration keys in production. Features will fail:', warnings);
    } else {
      logger.info('ℹ️  Missing integration keys (acceptable for local dev):', warnings);
    }
  }

  if (missing.length === 0) {
    logger.info('✅ Environment configuration check passed.');
  }
}
