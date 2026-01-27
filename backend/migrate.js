/* eslint-env node */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    throw e;
  }
}

export async function runMigrations() {
  await ensureMigrationsTable();

  const migrationsDir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations directory found; skipping.');
    return;
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const filename of files) {
    if (await alreadyApplied(filename)) continue;
    const filepath = path.join(migrationsDir, filename);
    await applySqlFile(filepath, filename);
  }
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
