#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const requiredFiles = [
  'nhost/metadata/metadata.yaml',
  'nhost/metadata/version.yaml',
  'nhost/metadata/databases/databases.yaml',
  'nhost/metadata/databases/default/tables/tables.yaml',
  'nhost/docs/permissions.md',
  'docs/runbooks/hasura-production-readiness.md',
  'docs/runbooks/hasura-permission-smoke.md',
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

export function checkHasuraReadiness(root = process.cwd()) {
  const missing = [];
  const warnings = [];

  for (const file of requiredFiles) {
    if (!existsSync(join(root, file))) missing.push(`${file}: required Hasura/Nhost readiness file is missing`);
  }

  const migrationsDir = join(root, 'nhost/migrations/default');
  if (!existsSync(migrationsDir)) {
    missing.push('nhost/migrations/default: migration directory is missing');
  } else {
    const migrationNames = readdirSync(migrationsDir, { withFileTypes: true }).filter((d) => d.isDirectory());
    const upCount = migrationNames.filter((d) => existsSync(join(migrationsDir, d.name, 'up.sql'))).length;
    if (upCount === 0) missing.push('nhost/migrations/default: no up.sql migrations found');
  }

  const tablesDir = join(root, 'nhost/metadata/databases/default/tables');
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

  const packageJson = join(root, 'package.json');
  if (existsSync(packageJson)) {
    const contents = readFileSync(packageJson, 'utf8');
    if (!contents.includes('check:nhost-config-safety')) {
      missing.push('package.json: check:nhost-config-safety must be wired into production checks');
    }
  }

  const workflowFiles = ['.github/workflows/hasura-permissions-smoke.yml', '.github/workflows/permissions_smoke.yml'];
  for (const workflowFile of workflowFiles) {
    const fullPath = join(root, workflowFile);
    if (!existsSync(fullPath)) {
      missing.push(`${workflowFile}: permission smoke workflow is missing`);
      continue;
    }
    const contents = readFileSync(fullPath, 'utf8');
    if (!/REQUIRE_HASURA_SMOKE:\s*(?:"true"|\$\{\{[\s\S]*?(workflow_dispatch|schedule|refs\/heads\/main)[\s\S]*?\}\})/.test(contents)) {
      missing.push(`${workflowFile}: protected permission smoke must set REQUIRE_HASURA_SMOKE=true`);
    }
    if (/secret is not set[\s\S]{0,160}exit 0/.test(contents)) {
      missing.push(`${workflowFile}: missing Hasura smoke secrets must not exit 0 in protected workflow paths`);
    }
  }

  const permissionsDoc = join(root, 'nhost/docs/permissions.md');
  if (existsSync(permissionsDoc)) {
    const contents = readFileSync(permissionsDoc, 'utf8').toLowerCase();
    const roles = ['anonymous', 'authenticated', 'parent', 'guardian', 'teacher', 'partner', 'admin', 'ops', 'system_admin'];
    for (const role of roles) {
      if (!contents.includes(role)) {
        warnings.push(`nhost/docs/permissions.md: role matrix should mention ${role}`);
      }
    }
    const evidenceTerms = ['evidence', 'forbidden', 'tenant isolation', 'audit'];
    for (const term of evidenceTerms) {
      if (!contents.includes(term)) {
        warnings.push(`nhost/docs/permissions.md: manual verification matrix should include ${term}`);
      }
    }
  }

  return { missing, warnings };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { missing, warnings } = checkHasuraReadiness();
  if (missing.length || warnings.length) {
    console.error('Hasura/Nhost readiness check results:');
    for (const issue of missing) console.error(`ERROR ${issue}`);
    for (const issue of warnings) console.error(`WARN ${issue}`);
    console.error('\nManual live verification still required: nhost link, nhost up --remote/metadata apply, metadata export diff, role-by-role permission smoke.');
    if (missing.length) process.exit(1);
  }
  console.log('Hasura/Nhost readiness artifacts are present. Manual live staging/production verification remains required.');
}
