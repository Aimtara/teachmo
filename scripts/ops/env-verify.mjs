#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { checkNhostConfigSafetyText } from '../check-nhost-config-safety.mjs';
import { parseCommonArgs, redact, writeReports } from './reporting.mjs';

const REQUIRED_BY_TARGET = {
  preview: [],
  staging: ['STAGING_APP_URL', 'STAGING_API_URL'],
  production: ['PRODUCTION_APP_URL', 'PRODUCTION_API_URL'],
};

function parseArgs(argv = process.argv.slice(2)) {
  const common = parseCommonArgs(argv);
  const opts = {
    ...common,
    target: 'preview',
    strict: false,
    checkLive: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--target') opts.target = argv[++i];
    else if (arg === '--strict') opts.strict = true;
    else if (arg === '--check-live') opts.checkLive = true;
  }
  return opts;
}

function envName(target, kind) {
  if (target === 'production') return `PRODUCTION_${kind}`;
  if (target === 'staging') return `STAGING_${kind}`;
  return kind;
}

async function fetchStatus(url) {
  const started = Date.now();
  const response = await fetch(url, { redirect: 'manual' });
  return {
    url: redact(url),
    status: response.status,
    ok: response.status >= 200 && response.status < 400,
    latencyMs: Date.now() - started,
  };
}

async function liveChecks(opts) {
  const checks = [];
  const appUrl = process.env[envName(opts.target, 'APP_URL')] || process.env.APP_URL;
  const apiUrl = process.env[envName(opts.target, 'API_URL')] || process.env.API_URL;

  if (!opts.checkLive) {
    return [{ name: 'Live endpoint checks', status: 'skip', details: 'Run with --check-live and target URLs to verify deployed endpoints.' }];
  }

  for (const [name, url] of [['App URL', appUrl], ['API URL', apiUrl]]) {
    if (!url) {
      checks.push({ name, status: opts.strict ? 'fail' : 'skip', details: `${name} is not configured.` });
      continue;
    }
    try {
      const result = await fetchStatus(url);
      checks.push({
        name,
        status: result.ok ? 'pass' : 'fail',
        details: `${result.url} returned ${result.status} in ${result.latencyMs}ms`,
      });
    } catch (error) {
      checks.push({ name, status: 'fail', details: `${redact(url)} failed: ${error.message}` });
    }
  }

  return checks;
}

function requiredEnvChecks(opts) {
  const required = REQUIRED_BY_TARGET[opts.target] ?? [];
  const configured = required.filter((name) => Boolean(process.env[name]));
  const missing = required.filter((name) => !process.env[name]);
  return [
    {
      name: `${opts.target} environment variables`,
      status: missing.length === 0 ? 'pass' : opts.strict ? 'fail' : 'skip',
      details: missing.length
        ? `Missing: ${missing.join(', ')}. Configured: ${configured.join(', ') || 'none'}`
        : `Configured: ${configured.join(', ') || 'none required'}`,
    },
  ];
}

function repositoryNhostChecks() {
  const text = readFileSync('nhost/nhost.toml', 'utf8');
  const violations = checkNhostConfigSafetyText(text, { file: 'nhost/nhost.toml' });
  return [
    {
      name: 'Repository Nhost config safety',
      status: violations.length ? 'fail' : 'pass',
      details: violations.length
        ? violations.map((item) => `${item.file}:${item.line} ${item.check}`).join('; ')
        : 'CORS, console, allowlist, anonymous auth, public DB access, email verification, HIBP, and concealed-error checks passed.',
    },
  ];
}

function hasuraSmokeChecks(opts) {
  const required = ['HASURA_GRAPHQL_ENDPOINT', 'TEST_JWT_TEACHER', 'TEST_JWT_DISTRICT_ADMIN'];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    return [{
      name: 'Hasura RBAC smoke',
      status: opts.strict ? 'fail' : 'skip',
      details: `Missing ${missing.join(', ')}. Protected scheduled runs must configure these secrets.`,
    }];
  }
  const result = spawnSync('node', ['scripts/hasura-permissions-smoke.mjs'], {
    encoding: 'utf8',
    env: { ...process.env, REQUIRE_HASURA_SMOKE: 'true' },
    maxBuffer: 10 * 1024 * 1024,
  });
  return [{
    name: 'Hasura RBAC smoke',
    status: result.status === 0 ? 'pass' : 'fail',
    details: redact([result.stdout, result.stderr].filter(Boolean).join('\n').slice(0, 4000)),
  }];
}

export async function buildEnvironmentVerificationReport(opts = parseArgs()) {
  const checks = [
    ...requiredEnvChecks(opts),
    ...repositoryNhostChecks(),
    ...hasuraSmokeChecks(opts),
    ...(await liveChecks(opts)),
  ];
  return {
    title: 'Environment Verification',
    generatedAt: new Date().toISOString(),
    summary: `Target: ${opts.target}. Strict mode: ${opts.strict ? 'enabled' : 'disabled'}.`,
    target: opts.target,
    checks,
    totals: {
      pass: checks.filter((check) => check.status === 'pass').length,
      fail: checks.filter((check) => check.status === 'fail').length,
      skip: checks.filter((check) => check.status === 'skip').length,
    },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const opts = parseArgs();
  const report = await buildEnvironmentVerificationReport(opts);
  const paths = writeReports({ outputDir: opts.outputDir, name: `environment-${opts.target}`, report });
  console.log(`[env-verify] ${JSON.stringify(report.totals)}`);
  console.log(`[env-verify] Wrote ${paths.jsonPath} and ${paths.mdPath}`);
  if (report.totals.fail > 0) process.exit(1);
}
