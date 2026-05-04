#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import YAML from 'yaml';
import { buildMarkdownReport, parseCommonArgs, redact, writeReports } from './reporting.mjs';

const DEFAULT_SKIP_MIGRATIONS = new Set(['20260124_ops_consolidate_and_timeline.sql']);

function trackedFiles(patterns) {
  const out = execFileSync('git', ['ls-files', ...patterns], { encoding: 'utf8' });
  return out.split('\n').filter(Boolean);
}

function parseArgs(argv = process.argv.slice(2)) {
  const common = parseCommonArgs(argv);
  const opts = {
    ...common,
    validateDb: argv.includes('--validate-db'),
    databaseUrl: process.env.DATABASE_URL || null,
    skipMigrations: new Set(DEFAULT_SKIP_MIGRATIONS),
  };

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--database-url') opts.databaseUrl = argv[++i];
    if (argv[i] === '--skip-migration') opts.skipMigrations.add(argv[++i]);
  }

  return opts;
}

function validateYamlFiles() {
  const files = trackedFiles(['nhost/metadata/**/*.yaml', 'nhost/metadata/**/*.yml', 'nhost/config.yaml']);
  const checks = [];

  for (const file of files) {
    try {
      YAML.parse(readFileSync(file, 'utf8'));
      checks.push({ name: `YAML parse: ${file}`, status: 'pass' });
    } catch (error) {
      checks.push({
        name: `YAML parse: ${file}`,
        status: 'fail',
        details: error.message,
      });
    }
  }

  return checks;
}

function metadataTableFiles() {
  return trackedFiles(['nhost/metadata/databases/default/tables/*.yaml']);
}

function validateMetadataTableRegistry() {
  const checks = [];
  const tableRegistry = 'nhost/metadata/databases/default/tables/tables.yaml';
  const tableFiles = metadataTableFiles().filter((file) => !file.endsWith('/tables.yaml'));
  const expectedEntries = tableFiles.map((file) => path.basename(file, '.yaml'));

  if (!existsSync(tableRegistry)) {
    return [{ name: 'Hasura table registry exists', status: 'fail', details: `${tableRegistry} missing` }];
  }

  const registryText = readFileSync(tableRegistry, 'utf8');
  const includeMatches = [...registryText.matchAll(/!\s*include\s+([^\s]+)/g)].map((match) =>
    path.basename(match[1], '.yaml'),
  );
  const registry = YAML.parse(registryText) ?? [];
  const registryNames = new Set(includeMatches);
  for (const entry of registry) {
    if (entry?.table?.name) registryNames.add(`${entry.table.schema ?? 'public'}_${entry.table.name}`);
  }
  const missing = expectedEntries.filter((entry) => !registryNames.has(entry));

  checks.push({
    name: 'Hasura table metadata registry references table files',
    status: missing.length ? 'fail' : 'pass',
    details: missing.length ? `Missing registry entries: ${missing.join(', ')}` : `${expectedEntries.length} table files registered`,
  });

  return checks;
}

function runCommand(name, command, args, env = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    maxBuffer: 30 * 1024 * 1024,
    env: { ...process.env, ...env },
  });

  return {
    name,
    status: result.status === 0 ? 'pass' : 'fail',
    details: redact([result.stdout, result.stderr].filter(Boolean).join('\n').trim()).slice(0, 4000),
  };
}

function buildSkipSql(skipMigrations) {
  if (skipMigrations.size === 0) return '';
  const values = [...skipMigrations]
    .filter(Boolean)
    .map((name) => `('${name.replace(/'/g, "''")}')`)
    .join(',');
  return `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id serial PRIMARY KEY,
      filename text NOT NULL UNIQUE,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
    INSERT INTO schema_migrations(filename)
    VALUES ${values}
    ON CONFLICT (filename) DO NOTHING;
  `;
}

function bootstrapAuthSchema(databaseUrl) {
  const sql = `
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    CREATE EXTENSION IF NOT EXISTS citext;
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE TABLE IF NOT EXISTS auth.users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text,
      display_name text,
      disabled boolean DEFAULT false,
      created_at timestamptz DEFAULT now()
    );
  `;

  return runCommand('Bootstrap local Nhost auth schema', 'psql', [databaseUrl, '-v', 'ON_ERROR_STOP=1', '-c', sql]);
}

function markSkippedMigrations(databaseUrl, skipMigrations) {
  const sql = buildSkipSql(skipMigrations);
  if (!sql) return { name: 'Mark known skipped migrations', status: 'skip', details: 'No skipped migrations configured.' };
  return runCommand('Mark known skipped migrations', 'psql', [databaseUrl, '-v', 'ON_ERROR_STOP=1', '-c', sql]);
}

function validateDatabase(opts) {
  if (!opts.validateDb) {
    return [{ name: 'Disposable database migration validation', status: 'skip', details: 'Run with --validate-db and DATABASE_URL to execute migrations.' }];
  }

  if (!opts.databaseUrl) {
    return [{ name: 'Disposable database migration validation', status: 'fail', details: 'DATABASE_URL is required for --validate-db.' }];
  }

  const checks = [
    bootstrapAuthSchema(opts.databaseUrl),
    markSkippedMigrations(opts.databaseUrl, opts.skipMigrations),
    runCommand('Run Nhost/backend migrations', 'node', ['backend/migrate.js'], {
      DATABASE_URL: opts.databaseUrl,
      REQUIRE_NHOST_BASE_SCHEMA: 'true',
    }),
    runCommand('Verify public schema tables exist', 'psql', [
      opts.databaseUrl,
      '-v',
      'ON_ERROR_STOP=1',
      '-tAc',
      "select count(*)::int from information_schema.tables where table_schema = 'public'",
    ]),
  ];

  return checks;
}

function validateGraphqlTypeGeneration() {
  if (!existsSync('codegen.yml')) {
    return [{ name: 'GraphQL type generation config', status: 'skip', details: 'codegen.yml is not configured; see docs/ci/schema-and-metadata.md.' }];
  }

  if (!process.env.HASURA_GRAPHQL_ENDPOINT && !process.env.HASURA_GRAPHQL_URL) {
    return [{ name: 'GraphQL type generation', status: 'skip', details: 'HASURA_GRAPHQL_ENDPOINT/HASURA_GRAPHQL_URL not configured for this context.' }];
  }

  return [runCommand('GraphQL type generation', 'npm', ['run', 'graphql:codegen'])];
}

export function buildSchemaMetadataReport(opts = parseArgs()) {
  const checks = [
    ...validateYamlFiles(),
    ...validateMetadataTableRegistry(),
    ...validateDatabase(opts),
    ...validateGraphqlTypeGeneration(),
  ];

  return {
    title: 'Schema and Metadata Validation',
    generatedAt: new Date().toISOString(),
    target: opts.validateDb ? 'disposable-db' : 'repository',
    checks,
    summary: {
      pass: checks.filter((check) => check.status === 'pass').length,
      fail: checks.filter((check) => check.status === 'fail').length,
      skip: checks.filter((check) => check.status === 'skip').length,
    },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const opts = parseArgs();
  const report = buildSchemaMetadataReport(opts);
  mkdirSync(opts.outputDir, { recursive: true });
  const paths = writeReports({ outputDir: opts.outputDir, name: 'schema-metadata', report });

  console.log(`[schema-metadata] ${JSON.stringify(report.summary)}`);
  console.log(`[schema-metadata] Wrote ${paths.jsonPath} and ${paths.mdPath}`);
  if (report.summary.fail > 0) process.exit(1);
}
