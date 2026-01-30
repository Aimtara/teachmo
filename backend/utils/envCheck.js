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

/**
 * Validates database connection configuration.
 * Requires either DATABASE_URL or all discrete DB_* variables.
 * @returns {{ isValid: boolean, errorMessage?: string }} Validation result
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
    return {
      isValid: false,
      errorMessage: 'Database configuration: Requires either DATABASE_URL or all of (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME)'
    };
  }

  return { isValid: true };
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
  const dbValidation = validateDatabaseConfig();

  // Check core required variables
  // Check required variable groups (at least one from each group must exist)
  Object.entries(REQUIRED_VAR_GROUPS).forEach(([groupName, vars]) => {
    const hasAtLeastOne = vars.some((key) => process.env[key]);
    if (!hasAtLeastOne) {
      missing.push(`${groupName} (one of: ${vars.join(', ')})`);
    }
  });

  // Check integration variables
  // Integrations (Warn only in dev, Error in Prod if critical)
  INTEGRATION_VARS.forEach((key) => {
    if (!process.env[key]) warnings.push(key);
  });

  // Report missing required variables
  if (missing.length > 0) {
    logger.error('❌ FATAL: Missing required environment variables:', missing);
  }

  // Report database configuration error separately for clarity
  if (!dbValidation.isValid) {
    logger.error('❌ FATAL:', dbValidation.errorMessage);
  }

  // Exit or warn based on environment
  if (missing.length > 0 || !dbValidation.isValid) {
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

  if (missing.length === 0 && dbValidation.isValid) {
    logger.info('✅ Environment configuration check passed.');
  }
}
