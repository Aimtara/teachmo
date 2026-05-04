#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

import { parseCommonArgs, writeReports } from './reporting.mjs';

const SECRET_REQUIREMENTS = {
  google_oauth_client_secret: [
    'GOOGLE_OAUTH_CLIENT_ID',
    'GOOGLE_OAUTH_NEW_CLIENT_SECRET',
    'NHOST_PROJECT_ID',
    'NHOST_MANAGEMENT_TOKEN',
  ],
  nhost_platform_secret: ['NHOST_PROJECT_ID', 'NHOST_MANAGEMENT_TOKEN', 'NHOST_NEW_ADMIN_SECRET'],
};

function argValue(argv, name, fallback = null) {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : fallback;
}

function parseArgs(argv = process.argv.slice(2)) {
  const common = parseCommonArgs(argv);
  const secretName = argValue(argv, '--secret', process.env.ROTATION_SECRET || 'google_oauth_client_secret')
    .replace(/-/g, '_');
  return {
    ...common,
    target: argValue(argv, '--target', process.env.ROTATION_TARGET || 'staging'),
    secretName,
    execute: argv.includes('--execute') || process.env.ROTATION_EXECUTE === 'true',
    approval: argValue(argv, '--approval', process.env.ROTATION_APPROVAL || ''),
    githubActor: process.env.GITHUB_ACTOR || 'local',
  };
}

function missingEnv(names, env = process.env) {
  return names.filter((name) => !env[name]);
}

function runLoginSmoke() {
  const command = process.env.POST_ROTATION_SMOKE_COMMAND;
  if (!command) {
    return {
      name: 'Post-rotation login smoke',
      status: 'skip',
      details: 'POST_ROTATION_SMOKE_COMMAND not configured. Attach manual login evidence before marking rotation complete.',
    };
  }

  try {
    execFileSync('bash', ['-lc', command], { stdio: 'pipe', encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    return {
      name: 'Post-rotation login smoke',
      status: 'pass',
      details: `Smoke command completed: ${command.replace(/secret|token|password/gi, '[redacted]')}`,
    };
  } catch (error) {
    return {
      name: 'Post-rotation login smoke',
      status: 'fail',
      details: error.stderr || error.stdout || error.message,
    };
  }
}

function buildRotationReport(opts = parseArgs()) {
  const required = SECRET_REQUIREMENTS[opts.secretName] ?? [];
  const missing = missingEnv(required);
  const checks = [
    {
      name: 'Rotation target classified',
      status: ['staging', 'production'].includes(opts.target) ? 'pass' : 'fail',
      details: `target=${opts.target}; production execution requires a protected GitHub Environment approval.`,
    },
    {
      name: 'Supported secret selected',
      status: required.length ? 'pass' : 'fail',
      details: required.length ? `${opts.secretName} rotation is scaffolded.` : `Unsupported secret ${opts.secretName}.`,
    },
    {
      name: 'Required provider credentials present',
      status: missing.length ? (opts.execute ? 'fail' : 'skip') : 'pass',
      details: missing.length
        ? `Missing variables: ${missing.join(', ')}. Dry-run records inventory only.`
        : `All required provider variables are present; values are redacted from reports.`,
    },
    {
      name: 'Human approval marker',
      status: opts.execute && opts.approval !== 'APPROVED' ? 'fail' : 'pass',
      details: opts.execute
        ? 'Execution requires --approval APPROVED after protected environment review.'
        : 'Dry-run prepare mode; no secret mutation attempted.',
    },
  ];

  if (opts.execute && missing.length === 0 && opts.approval === 'APPROVED') {
    checks.push({
      name: 'Provider rotation execution',
      status: 'skip',
      details:
        'Live provider mutation is intentionally not implemented with guessed APIs. Execute the provider-specific command from the generated evidence packet, then rerun post-rotation smoke.',
    });
    checks.push(runLoginSmoke());
  } else {
    checks.push({
      name: 'Provider rotation execution',
      status: 'skip',
      details: 'Prepare/dry-run mode only; no secret value was generated, printed, or changed.',
    });
  }

  const summary = {
    target: opts.target,
    secretName: opts.secretName,
    execute: opts.execute,
    actor: opts.githubActor,
    pass: checks.filter((check) => check.status === 'pass').length,
    fail: checks.filter((check) => check.status === 'fail').length,
    skip: checks.filter((check) => check.status === 'skip').length,
  };

  return {
    title: 'Secret Rotation Approval Report',
    generatedAt: new Date().toISOString(),
    summary: `Target: ${opts.target}; secret: ${opts.secretName}; mode: ${opts.execute ? 'execute' : 'prepare/dry-run'}.`,
    checks,
    rotation: {
      target: opts.target,
      secretName: opts.secretName,
      requiredEnv: required,
      humanApprovalRequired: true,
      evidenceTemplate: 'docs/readiness/evidence/oauth-secret-rotation-template.md',
      actor: opts.githubActor,
    },
    totals: summary,
  };
}

export { buildRotationReport, parseArgs };

if (import.meta.url === `file://${process.argv[1]}`) {
  const opts = parseArgs();
  const report = buildRotationReport(opts);
  const { jsonPath, mdPath } = writeReports({ outputDir: opts.outputDir, name: 'secret-rotation', report });
  console.log('[secret-rotation] Report generated with redacted evidence.');
  console.log(`[secret-rotation] Wrote ${jsonPath} and ${mdPath}`);
  if (report.totals.fail > 0) process.exit(1);
}
