#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';

import { parseCommonArgs, redact, writeReports } from './reporting.mjs';

function argValue(argv, name, fallback = null) {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : fallback;
}

function parseArgs(argv = process.argv.slice(2)) {
  const common = parseCommonArgs(argv);
  return {
    ...common,
    execute: argv.includes('--execute') || process.env.BACKUP_RESTORE_EXECUTE === 'true',
    sourceUrl: argValue(argv, '--source-url', process.env.BACKUP_SOURCE_DATABASE_URL || process.env.DATABASE_URL),
    restoreUrl: argValue(argv, '--restore-url', process.env.BACKUP_RESTORE_DATABASE_URL),
    target: argValue(argv, '--target', process.env.BACKUP_RESTORE_TARGET || 'disposable'),
  };
}

function commandExists(command) {
  const result = spawnSync('bash', ['-lc', `command -v ${command}`], { encoding: 'utf8' });
  return result.status === 0;
}

function runSql(databaseUrl, sql) {
  return execFileSync('psql', [databaseUrl, '-Atc', sql], {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  }).trim();
}

function snapshot(databaseUrl) {
  const tables = runSql(
    databaseUrl,
    `select schemaname || '.' || tablename
     from pg_tables
     where schemaname not in ('pg_catalog','information_schema')
     order by 1`,
  )
    .split('\n')
    .filter(Boolean);

  const counts = {};
  for (const table of tables) {
    counts[table] = Number(runSql(databaseUrl, `select count(*) from ${table}`) || 0);
  }
  return { tables, counts };
}

function diffSnapshots(before, after) {
  const failures = [];
  const beforeTables = new Set(before.tables);
  const afterTables = new Set(after.tables);
  for (const table of beforeTables) {
    if (!afterTables.has(table)) failures.push(`Missing restored table ${table}`);
  }
  for (const table of afterTables) {
    if (!beforeTables.has(table)) failures.push(`Unexpected restored table ${table}`);
  }
  for (const table of before.tables) {
    if (before.counts[table] !== after.counts[table]) {
      failures.push(`Row count mismatch for ${table}: ${before.counts[table]} != ${after.counts[table]}`);
    }
  }
  return failures;
}

export function buildBackupRestoreReport(opts = parseArgs()) {
  const checks = [
    {
      name: 'Operation target classified',
      status: ['disposable', 'staging', 'production'].includes(opts.target) ? 'pass' : 'fail',
      details: `target=${opts.target}; production requires protected environment approval.`,
    },
    {
      name: 'Postgres client tools available',
      status: commandExists('pg_dump') && commandExists('psql') && commandExists('pg_restore')
        ? 'pass'
        : opts.execute
          ? 'fail'
          : 'skip',
      details: 'Requires pg_dump, pg_restore, and psql on the runner.',
    },
    {
      name: 'Database URLs configured',
      status: opts.sourceUrl && opts.restoreUrl ? 'pass' : opts.execute ? 'fail' : 'skip',
      details: opts.sourceUrl && opts.restoreUrl
        ? `source=${redact(opts.sourceUrl)}; restore=${redact(opts.restoreUrl)}`
        : 'BACKUP_SOURCE_DATABASE_URL and BACKUP_RESTORE_DATABASE_URL required for execution.',
    },
  ];

  if (!opts.execute) {
    checks.push({
      name: 'Backup/restore execution',
      status: 'skip',
      details: 'Dry-run only. Add --execute with disposable/staging URLs to run pg_dump, restore, and compare schema/row counts.',
    });
  } else if (checks.some((check) => check.status === 'fail')) {
    checks.push({ name: 'Backup/restore execution', status: 'fail', details: 'Preconditions failed.' });
  } else {
    const workDir = path.join(opts.outputDir, 'backup-restore-work');
    mkdirSync(workDir, { recursive: true });
    const dumpPath = path.join(workDir, `teachmo-${Date.now()}.dump`);
    try {
      const before = snapshot(opts.sourceUrl);
      execFileSync('pg_dump', ['--format=custom', '--no-owner', '--file', dumpPath, opts.sourceUrl], {
        stdio: 'pipe',
        maxBuffer: 20 * 1024 * 1024,
      });
      execFileSync('pg_restore', ['--clean', '--if-exists', '--no-owner', '--dbname', opts.restoreUrl, dumpPath], {
        stdio: 'pipe',
        maxBuffer: 20 * 1024 * 1024,
      });
      const after = snapshot(opts.restoreUrl);
      const diffs = diffSnapshots(before, after);
      checks.push({
        name: 'Schema and row-count comparison',
        status: diffs.length ? 'fail' : 'pass',
        details: diffs.length ? diffs.join('\n') : `${before.tables.length} tables restored with matching row counts.`,
      });
    } catch (error) {
      checks.push({
        name: 'Backup/restore execution',
        status: 'fail',
        details: redact(error.stderr || error.stdout || error.message),
      });
    } finally {
      if (existsSync(dumpPath)) rmSync(dumpPath, { force: true });
    }
  }

  const summary = {
    pass: checks.filter((check) => check.status === 'pass').length,
    fail: checks.filter((check) => check.status === 'fail').length,
    skip: checks.filter((check) => check.status === 'skip').length,
  };

  return {
    title: 'Backup/Restore Drill Report',
    generatedAt: new Date().toISOString(),
    summary: `Target: ${opts.target}; mode: ${opts.execute ? 'execute' : 'dry-run'}.`,
    checks,
    result: summary,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const opts = parseArgs();
  const report = buildBackupRestoreReport(opts);
  const paths = writeReports({ outputDir: opts.outputDir, name: 'backup-restore-drill', report });
  console.log(`[backup-restore] ${JSON.stringify(report.result)}`);
  console.log(`[backup-restore] Wrote ${paths.jsonPath} and ${paths.mdPath}`);
  if (report.result.fail > 0) process.exit(1);
}
