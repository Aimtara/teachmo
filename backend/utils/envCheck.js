/* eslint-env node */
import { createLogger } from './logger.js';

const logger = createLogger('env-check');

// Check for at least one admin secret variant and one GraphQL URL variant
const REQUIRED_ADMIN_SECRET_VARS = ['NHOST_ADMIN_SECRET', 'HASURA_GRAPHQL_ADMIN_SECRET', 'HASURA_ADMIN_SECRET'];
const REQUIRED_GRAPHQL_URL_VARS = ['NHOST_GRAPHQL_URL', 'HASURA_GRAPHQL_URL', 'NHOST_BACKEND_URL'];
const REQUIRED_VARS = ['AUTH_JWKS_URL'];
const REQUIRED_VARS = ['NHOST_ADMIN_SECRET', 'AUTH_JWKS_URL'];

const INTEGRATION_VARS = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'OPENAI_API_KEY'];

export function performStartupCheck() {
  const isProd = process.env.NODE_ENV === 'production';
  const missing = [];
  const warnings = [];

  // Check that at least one admin secret variant exists
  const hasAdminSecret = REQUIRED_ADMIN_SECRET_VARS.some((key) => process.env[key]);
  if (!hasAdminSecret) {
    missing.push(`One of: ${REQUIRED_ADMIN_SECRET_VARS.join(', ')}`);
  }

  // Check that at least one GraphQL URL variant exists
  const hasGraphqlUrl = REQUIRED_GRAPHQL_URL_VARS.some((key) => process.env[key]);
  if (!hasGraphqlUrl) {
    missing.push(`One of: ${REQUIRED_GRAPHQL_URL_VARS.join(', ')}`);
  }

  // Check other required vars
  REQUIRED_VARS.forEach((key) => {
    if (!process.env[key]) missing.push(key);
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
