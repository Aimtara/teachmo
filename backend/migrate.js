/* eslint-env node */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

async function ensureMigrationsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id serial PRIMARY KEY,
      filename text NOT NULL UNIQUE,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `);
}

async function alreadyApplied(filename) {
  const res = await query('SELECT 1 FROM schema_migrations WHERE filename = $1 LIMIT 1', [filename]);
  return res.rowCount > 0;
}

async function recordApplied(filename) {
  await query('INSERT INTO schema_migrations(filename) VALUES ($1)', [filename]);
}



async function applySqlFile(filepath, filename) {
  const sql = fs.readFileSync(filepath, 'utf8');
  await query('BEGIN');
  try {
    await query(sql);
    await recordApplied(filename);
    await query('COMMIT');
    console.log(`✅ Applied ${filename}`);
  } catch (e) {
    await query('ROLLBACK');
    console.error(`❌ Failed ${filename}`);
    printMissingBaseSchemaGuidance(e, filename);
    throw e;
  }
}

async function verifyNhostBaseSchema() {
  // Check for critical base tables that Nhost migrations should provide
  const requiredTables = ['audit_log', 'profiles', 'organizations', 'schools'];
  const missingTables = [];

  for (const tableName of requiredTables) {
    const res = await query(`SELECT to_regclass($1) AS relation_name`, [`public.${tableName}`]);
    if (!res.rows?.[0]?.relation_name) {
      missingTables.push(tableName);
    }
  }

  if (missingTables.length > 0) {
    console.error('');
    console.error('❌ Required Nhost base tables are missing from the database:');
    console.error(`   ${missingTables.map(t => `public.${t}`).join(', ')}`);
    console.error('');
    console.error('Backend migrations depend on the Nhost/Hasura base schema being applied first.');
    console.error('Please apply Nhost migrations before running backend migrations:');
    console.error('');
    console.error('  For local development:');
    console.error('    nhost up');
    console.error('');
    console.error('  For remote/production environments:');
    console.error('    nhost up --remote');
    console.error('');
    console.error('  If your local workspace is not linked to a remote app:');
    console.error('    nhost link');
    console.error('');
    throw new Error(`Missing required Nhost base tables: ${missingTables.join(', ')}`);
  }

  console.log('✅ Nhost base schema verified');
}


async function applyBackendMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.log('No backend migrations directory found; skipping downstream migrations.');
    return;
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  console.log(`Applying ${files.length} backend migration files (downstream phase)...`);

  for (const filename of files) {
    if (await alreadyApplied(filename)) continue;
    const filepath = path.join(migrationsDir, filename);
    await applySqlFile(filepath, filename);
  }

  console.log('✅ Backend downstream migrations completed');
}

function printMissingBaseSchemaGuidance(error, filename) {
  const message = String(error?.message || '');
  const detail = String(error?.detail || '');
  const hint = String(error?.hint || '');
  const metadata = `${message}\n${detail}\n${hint}`.toLowerCase();

  // Check for common "relation does not exist" or "table does not exist" errors
  const missingRelation =
    metadata.includes('does not exist') &&
    (metadata.includes('relation') || metadata.includes('table'));

  if (!missingRelation) return;

  console.error('');
  console.error('💡 Migration dependency issue detected.');
  console.error(
    `The backend migration "${filename}" expects Nhost/Hasura base tables to exist first.`
  );
  console.error('');
  console.error('Please apply Nhost migrations before running backend migrations:');
  console.error('');
  console.error('  For local development:');
  console.error('    nhost up');
  console.error('');
  console.error('  For remote/production environments:');
  console.error('    nhost up --remote');
  console.error('');
  console.error('  If your local workspace is not linked to a remote app:');
  console.error('    nhost link');
  console.error('');
}

// Use a PostgreSQL advisory lock to ensure only one migration runner executes at a time.
// This prevents race conditions when multiple backend instances start concurrently during deployment.
// 
// The lock key (7623849172638491) was chosen as an arbitrary but stable 64-bit integer that's
// unlikely to collide with other advisory locks in the system. If you're using advisory locks
// elsewhere in your application, consider deriving this from a hash of "teachmo:migrations".
//
// This implementation uses a blocking lock: if another process holds the lock, this process will
// wait indefinitely until the lock is released. For typical migration runs (< 1 minute), this
// provides predictable serialization. If migrations take longer or you need more control, consider
// using pg_try_advisory_lock() with retry logic and timeout handling.
const MIGRATION_ADVISORY_LOCK_KEY = 7623849172638491n;

async function withMigrationAdvisoryLock(fn) {
  // Acquire an exclusive advisory lock for the duration of the migration run.
  // This will block if another process currently holds the same lock key.
  await query('SELECT pg_advisory_lock($1);', [MIGRATION_ADVISORY_LOCK_KEY]);
  try {
    return await fn();
  } finally {
    try {
      await query('SELECT pg_advisory_unlock($1);', [MIGRATION_ADVISORY_LOCK_KEY]);
    } catch (unlockError) {
      // Do not mask the original migration error, but log unlock issues for observability.
      console.error('Failed to release migration advisory lock:', unlockError);
    }
  }
}

export async function runMigrations() {
  await withMigrationAdvisoryLock(async () => {
    await ensureMigrationsTable();

    console.log('➡️ Migration phase 1/2: verifying Nhost base schema');
    await verifyNhostBaseSchema();

    console.log('➡️ Migration phase 2/2: applying backend schema updates');
    await applyBackendMigrations();
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(() => {
      console.log('✅ Migrations complete');
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
