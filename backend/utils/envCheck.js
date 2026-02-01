/* eslint-env node */
import { createLogger } from './logger.js';
const logger = createLogger('env-check');

// At least one from each group must be present
const REQUIRED_VAR_GROUPS = {
  'GraphQL URL': ['NHOST_GRAPHQL_URL', 'HASURA_GRAPHQL_URL', 'NHOST_BACKEND_URL'],
  'Admin Secret': ['NHOST_ADMIN_SECRET', 'HASURA_GRAPHQL_ADMIN_SECRET', 'HASURA_ADMIN_SECRET'],
  'JWKS URL': ['AUTH_JWKS_URL', 'NHOST_JWKS_URL']
};

const INTEGRATION_VARS = ['OPENAI_API_KEY'];

// Check for at least one admin secret variant and one GraphQL URL variant
const REQUIRED_ADMIN_SECRET_VARS = ['NHOST_ADMIN_SECRET', 'HASURA_GRAPHQL_ADMIN_SECRET', 'HASURA_ADMIN_SECRET'];
const REQUIRED_GRAPHQL_URL_VARS = ['NHOST_GRAPHQL_URL', 'HASURA_GRAPHQL_URL', 'NHOST_BACKEND_URL'];
const REQUIRED_VARS = ['AUTH_JWKS_URL'];
const REQUIRED_VARS = ['NHOST_ADMIN_SECRET', 'AUTH_JWKS_URL'];

const INTEGRATION_VARS = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'OPENAI_API_KEY'];
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
    } else {
      logger.warn('⚠️  Non-production environment tolerating missing variables.');
    }
  } else {
    logger.info('✅ Environment configuration check passed.');
  }
}
