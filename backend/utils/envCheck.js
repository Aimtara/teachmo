/* eslint-env node */
import { createLogger } from './logger.js';
const logger = createLogger('env-check');

const REQUIRED_VARS = ['NHOST_ADMIN_SECRET', 'AUTH_JWKS_URL'];

export function performStartupCheck() {
  const missing = REQUIRED_VARS.filter(key => !process.env[key]);
  if (missing.length > 0) {
    logger.error('❌ FATAL: Missing env vars:', missing);
    if (process.env.NODE_ENV === 'production') process.exit(1);
  } else {
    logger.info('✅ Startup Environment Check Passed');
  }
}
