/* eslint-env node */
import { createLogger } from './logger.js';

const logger = createLogger('env-check');

const REQUIRED_VARS = ['NHOST_ADMIN_SECRET', 'NHOST_SUBDOMAIN', 'NHOST_REGION', 'AUTH_JWKS_URL'];

const INTEGRATION_VARS = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'OPENAI_API_KEY'];

/**
 * Validates database connection configuration.
 * Requires either DATABASE_URL or all discrete DB_* variables.
 * @returns {string[]} Array of missing variable names, or empty array if valid
 */
function validateDatabaseConfig() {
  const hasDatabaseUrl = !!process.env.DATABASE_URL;
  const hasDiscreteVars = !!(
    process.env.DB_HOST &&
    process.env.DB_PORT &&
    process.env.DB_USER &&
    process.env.DB_PASSWORD &&
    process.env.DB_NAME
  );

  if (!hasDatabaseUrl && !hasDiscreteVars) {
    if (!hasDatabaseUrl) {
      return ['DATABASE_URL or (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME)'];
    }
  }

  return [];
}

/**
 * Performs startup environment validation.
 * 
 * In production mode:
 * - Missing required variables (including database config) will cause the server to exit.
 * - Missing integration variables will log warnings but allow startup.
 * 
 * In non-production mode:
 * - Missing required variables (including database config) will log errors but allow startup.
 *   This permits local development, but operations requiring these variables (e.g., runMigrations,
 *   schedulers) may fail with clearer error messages at runtime.
 * - Missing integration variables will log info messages.
 */
export function performStartupCheck() {
  const isProd = process.env.NODE_ENV === 'production';
  const missing = [];
  const warnings = [];

  // Check core required variables
  REQUIRED_VARS.forEach((key) => {
    if (!process.env[key]) missing.push(key);
  });

  // Check database configuration (critical for migrations and schedulers)
  const dbErrors = validateDatabaseConfig();
  if (dbErrors.length > 0) {
    missing.push(...dbErrors);
  }

  // Check integration variables
  INTEGRATION_VARS.forEach((key) => {
    if (!process.env[key]) warnings.push(key);
  });

  if (missing.length > 0) {
    logger.error('❌ FATAL: Missing required environment variables:', missing);
    if (isProd) {
      logger.error('Server cannot start in production without these variables.');
      process.exit(1);
    } else {
      logger.error('⚠️  Continuing in non-production mode, but operations like migrations and database-dependent schedulers will fail.');
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
