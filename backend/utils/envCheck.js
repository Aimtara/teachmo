/* eslint-env node */
import { createLogger } from './logger.js';

const logger = createLogger('env-check');

// Variables that must be present (exact match)
const REQUIRED_VARS = ['AUTH_JWKS_URL'];

// At least one from each group must be present
const REQUIRED_VAR_GROUPS = {
  'GraphQL URL': ['NHOST_GRAPHQL_URL', 'HASURA_GRAPHQL_URL', 'NHOST_BACKEND_URL'],
  'Admin Secret': ['NHOST_ADMIN_SECRET', 'HASURA_GRAPHQL_ADMIN_SECRET', 'HASURA_ADMIN_SECRET']
};

const INTEGRATION_VARS = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'OPENAI_API_KEY'];

export function performStartupCheck() {
  const isProd = process.env.NODE_ENV === 'production';
  const missing = [];
  const warnings = [];

  // Check individual required variables
  REQUIRED_VARS.forEach((key) => {
    if (!process.env[key]) missing.push(key);
  });

  // Check required variable groups (at least one from each group must exist)
  Object.entries(REQUIRED_VAR_GROUPS).forEach(([groupName, vars]) => {
    const hasAtLeastOne = vars.some((key) => process.env[key]);
    if (!hasAtLeastOne) {
      missing.push(`${groupName} (one of: ${vars.join(', ')})`);
    }
  });

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
