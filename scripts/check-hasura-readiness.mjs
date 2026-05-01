#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const requiredFiles = [
  'nhost/metadata/metadata.yaml',
  'nhost/metadata/version.yaml',
  'nhost/metadata/databases/databases.yaml',
  'nhost/metadata/databases/default/tables/tables.yaml',
  'nhost/docs/permissions.md',
];

const criticalTables = [
  'public_profiles',
  'public_user_profiles',
  'public_children',
  'public_guardian_children',
  'public_message_threads',
  'public_messages',
  'public_thread_participants',
  'public_audit_log',
  'public_organizations',
  'public_schools',
  'public_classrooms',
  'public_partner_submissions',
];

const missing = [];
const warnings = [];

for (const file of requiredFiles) {
  if (!existsSync(join(ROOT, file))) missing.push(`${file}: required Hasura/Nhost readiness file is missing`);
}

const migrationsDir = join(ROOT, 'nhost/migrations/default');
if (!existsSync(migrationsDir)) {
  missing.push('nhost/migrations/default: migration directory is missing');
} else {
  const migrationNames = readdirSync(migrationsDir, { withFileTypes: true }).filter((d) => d.isDirectory());
  const upCount = migrationNames.filter((d) => existsSync(join(migrationsDir, d.name, 'up.sql'))).length;
  if (upCount === 0) missing.push('nhost/migrations/default: no up.sql migrations found');
}

const tablesDir = join(ROOT, 'nhost/metadata/databases/default/tables');
if (existsSync(tablesDir)) {
  for (const table of criticalTables) {
    const file = join(tablesDir, `${table}.yaml`);
    if (!existsSync(file)) {
      warnings.push(`${table}: metadata file not found; verify table is not intentionally absent`);
      continue;
    }
    const contents = readFileSync(file, 'utf8');
    const permissions = ['select_permissions', 'insert_permissions', 'update_permissions', 'delete_permissions'].filter((p) =>
      contents.includes(p)
    );
    if (permissions.length === 0) {
      warnings.push(`${table}: metadata file has no explicit permissions block`);
    }
  }
}

if (missing.length || warnings.length) {
  console.error('Hasura/Nhost readiness check results:');
  for (const issue of missing) console.error(`ERROR ${issue}`);
  for (const issue of warnings) console.error(`WARN ${issue}`);
  console.error('\nManual live verification still required: nhost link, nhost up --remote/metadata apply, metadata export diff, role-by-role permission smoke.');
  if (missing.length) process.exit(1);
}

console.log('Hasura/Nhost readiness artifacts are present. Manual live staging/production verification remains required.');
