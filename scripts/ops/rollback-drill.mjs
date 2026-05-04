#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

import { parseCommonArgs, writeReports } from './reporting.mjs';

function argValue(argv, name, fallback = null) {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : fallback;
}

function parseArgs(argv = process.argv.slice(2)) {
  const common = parseCommonArgs(argv);
  return {
    ...common,
    target: argValue(argv, '--target', process.env.ROLLBACK_TARGET || 'staging'),
    execute: argv.includes('--execute') || process.env.ROLLBACK_EXECUTE === 'true',
    approval: argValue(argv, '--approval', process.env.ROLLBACK_APPROVAL || ''),
    currentRef: argValue(argv, '--current-ref', process.env.CURRENT_DEPLOY_REF || process.env.GITHUB_SHA || 'HEAD'),
    previousRef: argValue(argv, '--previous-ref', process.env.PREVIOUS_DEPLOY_REF || 'HEAD~1'),
    smokeCommand: argValue(argv, '--smoke-command', process.env.ROLLBACK_SMOKE_COMMAND || 'npm run test:smoke'),
    deployCommand: process.env.ROLLBACK_DEPLOY_COMMAND || '',
  };
}

function commandCheck(name, command, { execute }) {
  if (!command) {
    return {
      name,
      status: execute ? 'fail' : 'skip',
      details: 'No deploy command configured. Dry-run produces the manual command plan only.',
    };
  }

  if (!execute) {
    return {
      name,
      status: 'skip',
      details: `Dry-run would execute configured command: ${command.replace(/token|secret|password/gi, '[redacted]')}`,
    };
  }

  try {
    execFileSync('bash', ['-lc', command], { stdio: 'pipe', encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    return { name, status: 'pass', details: 'Command completed.' };
  } catch (error) {
    return { name, status: 'fail', details: error.stderr || error.stdout || error.message };
  }
}

function smokeCheck(command, { execute }) {
  if (!execute) {
    return { name: 'Rollback smoke tests', status: 'skip', details: `Dry-run would run: ${command}` };
  }
  return commandCheck('Rollback smoke tests', command, { execute });
}

export function buildRollbackReport(opts = parseArgs()) {
  const checks = [
    {
      name: 'Rollback target classified',
      status: ['staging', 'production'].includes(opts.target) ? 'pass' : 'fail',
      details: `target=${opts.target}; production execution requires protected environment approval.`,
    },
    {
      name: 'Human approval marker',
      status: opts.execute && opts.approval !== 'APPROVED' ? 'fail' : 'pass',
      details: opts.execute ? 'Execution requires --approval APPROVED.' : 'Dry-run only; no deployment mutation attempted.',
    },
    {
      name: 'Deployment refs resolved',
      status: opts.currentRef && opts.previousRef ? 'pass' : 'fail',
      details: `previous=${opts.previousRef}; current=${opts.currentRef}`,
    },
    commandCheck('Deploy previous version', opts.deployCommand.replaceAll('{ref}', opts.previousRef), opts),
    smokeCheck(opts.smokeCommand, opts),
    commandCheck('Redeploy current version', opts.deployCommand.replaceAll('{ref}', opts.currentRef), opts),
  ];

  return {
    title: 'Rollback Drill Report',
    generatedAt: new Date().toISOString(),
    summary: `Target: ${opts.target}; mode: ${opts.execute ? 'execute' : 'dry-run'}; previous=${opts.previousRef}; current=${opts.currentRef}.`,
    target: opts.target,
    execute: opts.execute,
    previousRef: opts.previousRef,
    currentRef: opts.currentRef,
    checks,
    result: {
      pass: checks.filter((check) => check.status === 'pass').length,
      fail: checks.filter((check) => check.status === 'fail').length,
      skip: checks.filter((check) => check.status === 'skip').length,
    },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const opts = parseArgs();
  const report = buildRollbackReport(opts);
  const { jsonPath, mdPath } = writeReports({ outputDir: opts.outputDir, name: 'rollback-drill', report });
  console.log(`[rollback-drill] ${JSON.stringify(report.result)}`);
  console.log(`[rollback-drill] Wrote ${jsonPath} and ${mdPath}`);
  if (report.result.fail > 0) process.exit(1);
}
