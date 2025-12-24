/* eslint-env node */

export function seedDemoData() {
  if (process.env.SEED_DEMO_DATA !== 'true') {
    return;
  }

  console.warn('Demo seeding is disabled for database-backed partner portal data.');
}
