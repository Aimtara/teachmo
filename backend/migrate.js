/* eslint-env node */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');


function boolEnv(name, defaultValue = false) {
  const value = process.env[name];
  if (value === undefined || value === null || value === '') return defaultValue;
  return String(value).toLowerCase() === 'true';
}

// Render-safe default:
// - if nhost migration files are not available in the runtime image, warn and continue.
// Set REQUIRE_NHOST_BASE_SCHEMA=true to enforce strict startup.
const REQUIRE_NHOST_BASE_SCHEMA = boolEnv('REQUIRE_NHOST_BASE_SCHEMA', false);

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

function collectSqlFiles(dirPath, matcher = (name) => name.endsWith('.sql')) {
  if (!fs.existsSync(dirPath)) return [];

  const files = [];
  const stack = [dirPath];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolute);
      } else if (matcher(entry.name)) {
        files.push(absolute);
      }
    }
  }

  return files.sort((a, b) => a.localeCompare(b));
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
    if (!filename.startsWith('nhost:')) {
      printMissingBaseSchemaGuidance(e, filename);
    }
    throw e;
  }
}

async function isAuditLogPresent() {
  const res = await query(`
    SELECT to_regclass('public.audit_log') AS relation_name
  `);
  return Boolean(res.rows?.[0]?.relation_name);
}


async function bootstrapEssentialBaseTables() {
  console.warn('⚠️ Falling back to minimal base schema bootstrap (public.audit_log only).');

  await query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    CREATE TABLE IF NOT EXISTS public.audit_log (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at timestamptz NOT NULL DEFAULT now(),
      actor_id uuid NOT NULL,
      action text NOT NULL,
      entity_type text NOT NULL,
      entity_id uuid NULL,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb
    );

    CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON public.audit_log(created_at DESC);
    CREATE INDEX IF NOT EXISTS audit_log_actor_id_idx ON public.audit_log(actor_id);
    CREATE INDEX IF NOT EXISTS audit_log_entity_idx ON public.audit_log(entity_type, entity_id);
  `);

  const marker = 'nhost:fallback:minimal-audit-log';
  if (!(await alreadyApplied(marker))) {
    await recordApplied(marker);
  }

  console.log('✅ Minimal base schema bootstrap completed');
}

function resolveNhostMigrationsDir() {
  if (process.env.NHOST_MIGRATIONS_DIR) {
    return path.resolve(process.env.NHOST_MIGRATIONS_DIR);
  }

  return path.join(repoRoot, 'nhost', 'migrations');
}

async function applyNhostSchemaMigrations() {
  const nhostMigrationsDir = resolveNhostMigrationsDir();
  const upFiles = collectSqlFiles(nhostMigrationsDir, (name) => name === 'up.sql');

  if (upFiles.length === 0) {
    console.warn(`⚠️ No Nhost migration files found at ${nhostMigrationsDir}; skipping Nhost schema bootstrap.`);
    if (REQUIRE_NHOST_BASE_SCHEMA) {
      console.warn(
        '⚠️ REQUIRE_NHOST_BASE_SCHEMA=true, so the migration runner will require base schema presence after fallback checks.'
      );
    }
    return false;
  }

  console.log(`Applying ${upFiles.length} Nhost migration files to bootstrap base schema...`);

  for (const filepath of upFiles) {
    const relative = path.relative(repoRoot, filepath).split(path.sep).join('/');
    const migrationName = `nhost:${relative}`;

    if (await alreadyApplied(migrationName)) continue;
    await applySqlFile(filepath, migrationName);
  }

  console.log('✅ Nhost schema bootstrap completed');
  return true;
}

async function ensureNhostBaseSchema() {
  const shouldBootstrap = String(process.env.AUTO_APPLY_NHOST_SCHEMA || 'true').toLowerCase() !== 'false';
  if (!shouldBootstrap) return;

  const hasAuditLog = await isAuditLogPresent();
  if (hasAuditLog) return;

  console.log('⚠️ public.audit_log is missing; bootstrapping Nhost base schema from local migrations...');

  try {
    await applyNhostSchemaMigrations();
  } catch (error) {
    if (REQUIRE_NHOST_BASE_SCHEMA) throw error;
    console.warn('⚠️ Nhost schema bootstrap skipped/failed (non-fatal):', error?.message || error);
  }

  let hasAuditLogAfterBootstrap = await isAuditLogPresent();
  if (!hasAuditLogAfterBootstrap) {
    try {
      await bootstrapEssentialBaseTables();
      hasAuditLogAfterBootstrap = await isAuditLogPresent();
    } catch (error) {
      if (REQUIRE_NHOST_BASE_SCHEMA) throw error;
      console.warn('⚠️ Minimal base schema fallback failed (non-fatal):', error?.message || error);
    }
  }

  if (!hasAuditLogAfterBootstrap) {
    if (REQUIRE_NHOST_BASE_SCHEMA) {
      throw new Error(
        'Nhost schema bootstrap/fallback completed but public.audit_log is still missing. Ensure local nhost migrations are up to date or run `nhost up --remote`.'
      );
    }

    console.warn(
      '⚠️ public.audit_log is still missing after bootstrap + fallback attempts. ' +
        'Continuing startup because REQUIRE_NHOST_BASE_SCHEMA=false. ' +
        'Recommended fix: run `nhost link` then `nhost up --remote` to apply the base schema to the remote DB.'
    );
  }
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

  const missingAuditLog =
    metadata.includes('relation "public.audit_log" does not exist') ||
    metadata.includes('relation public.audit_log does not exist');

  if (!missingAuditLog) return;

  console.error('');
  console.error('💡 Migration dependency issue detected.');
  console.error(
    `The backend migration "${filename}" expects Nhost/Hasura base tables (like public.audit_log) to exist first.`
  );
  console.error('This backend can bootstrap schema from local nhost/migrations automatically.');
  console.error('If you need to push the same schema manually to a remote app, run:');
  console.error('  - nhost up');
  console.error('  - or: nhost up --remote');
  console.error('If needed, run "nhost link" first so the local workspace points to the correct remote app.');
  console.error('');
}

/**
 * Wraps migration execution with a PostgreSQL advisory lock to prevent
 * concurrent migration runs (e.g., during parallel deployments).
 * Uses lock key 7623849172638491 (derived from 'teachmo-migrations' string hash).
 */
async function withMigrationAdvisoryLock(fn) {
  const LOCK_KEY = 7623849172638491; // Derived from hash of 'teachmo-migrations'
  let lockAcquired = false;
  
  console.log('🔒 Acquiring migration advisory lock...');
  
  try {
    // Try to acquire the lock (non-blocking check first)
    const lockResult = await query('SELECT pg_try_advisory_lock($1) AS acquired', [LOCK_KEY]);
    lockAcquired = lockResult.rows[0]?.acquired === true;
    
    if (!lockAcquired) {
      console.log('⏳ Another migration is in progress. Waiting for lock...');
      // Blocking acquire - will wait until lock is available
      const blockingResult = await query('SELECT pg_advisory_lock($1)', [LOCK_KEY]);
      // pg_advisory_lock returns void on success, throws on error
      if (blockingResult) {
        lockAcquired = true;
        console.log('🔒 Advisory lock acquired (after waiting)');
      }
    } else {
      console.log('🔒 Advisory lock acquired');
    }
    
    // Execute the migration function
    await fn();
    
  } finally {
    // Only release the lock if it was successfully acquired
    if (lockAcquired) {
      try {
        await query('SELECT pg_advisory_unlock($1)', [LOCK_KEY]);
        console.log('🔓 Advisory lock released');
      } catch (unlockError) {
        console.error('⚠️ Failed to release advisory lock:', unlockError);
        // Log but don't throw - the lock will be released when the connection closes
      }
    }
  }
}

export async function runMigrations() {
  await withMigrationAdvisoryLock(async () => {
    await ensureMigrationsTable();

    console.log('➡️ Migration phase 1/2: upstream Nhost base schema');
    await ensureNhostBaseSchema();

    console.log('➡️ Migration phase 2/2: downstream backend schema updates');
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
