#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const REQUIRED_EXCEPTION_FIELDS = [
  'package',
  'advisories',
  'severity',
  'exposure',
  'reason',
  'mitigation',
  'owner',
  'expires',
];

const HIGH_SEVERITIES = new Set(['high', 'critical']);
const VALID_SEVERITIES = new Set(['low', 'moderate', 'high', 'critical']);

export function validateAuditExceptions(exceptionsConfig, { today = new Date().toISOString().slice(0, 10) } = {}) {
  const failures = [];
  const exceptions = exceptionsConfig?.exceptions;

  if (!Array.isArray(exceptions)) {
    return ['config/audit-exceptions.json must contain an exceptions array.'];
  }

  for (const [index, entry] of exceptions.entries()) {
    const label = entry?.package ? `${entry.package} exception` : `exception[${index}]`;

    for (const field of REQUIRED_EXCEPTION_FIELDS) {
      if (entry?.[field] === undefined || entry?.[field] === null || entry?.[field] === '') {
        failures.push(`${label} is missing required field "${field}".`);
      }
    }

    if (!Array.isArray(entry?.advisories) || entry.advisories.length === 0) {
      failures.push(`${label} must list at least one advisory/dependency in "advisories".`);
    }

    if (entry?.severity && !VALID_SEVERITIES.has(entry.severity)) {
      failures.push(`${label} has invalid severity "${entry.severity}".`);
    }

    if (entry?.expires && !/^\d{4}-\d{2}-\d{2}$/.test(entry.expires)) {
      failures.push(`${label} expires must use YYYY-MM-DD format.`);
    } else if (entry?.expires && entry.expires < today) {
      failures.push(`${label} expired on ${entry.expires}; review or remove it.`);
    }

    for (const textField of ['exposure', 'reason', 'mitigation']) {
      if (typeof entry?.[textField] === 'string' && entry[textField].trim().length < 20) {
        failures.push(`${label} field "${textField}" must include a meaningful justification.`);
      }
    }
  }

  return failures;
}

function parseArgs(argv) {
  const options = {
    auditFile: null,
    exceptionsFile: new URL('../config/audit-exceptions.json', import.meta.url),
    output: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--audit-file') {
      options.auditFile = argv[++i];
    } else if (arg === '--exceptions-file') {
      options.exceptionsFile = new URL(argv[++i], `file://${process.cwd()}/`);
    } else if (arg === '--output') {
      options.output = argv[++i];
    }
  }

  return options;
}

function loadAuditReport(auditFile) {
  if (auditFile) {
    return JSON.parse(readFileSync(auditFile, 'utf8'));
  }

  const result = spawnSync(
    'npm',
    ['audit', '--audit-level=high', '--omit=dev', '--omit=optional', '--json'],
    { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
  );

  try {
    return JSON.parse(result.stdout || '{}');
  } catch (error) {
    console.error('[audit-check] Failed to parse npm audit JSON:', error.message);
    if (result.stdout) console.error(result.stdout);
    if (result.stderr) console.error(result.stderr);
    process.exit(1);
  }
}

function findingAdvisoryNames(finding) {
  return (finding.via ?? []).map((via) => (typeof via === 'string' ? via : via?.name)).filter(Boolean);
}

export function evaluateAuditPolicy(report, exceptionsConfig, { today = new Date().toISOString().slice(0, 10) } = {}) {
  const exceptionFailures = validateAuditExceptions(exceptionsConfig, { today });
  const vulnerabilities = Object.values(report.vulnerabilities ?? {});
  const highFindings = vulnerabilities.filter((finding) => HIGH_SEVERITIES.has(finding.severity));
  const activeExceptions = new Map(
    exceptionsConfig.exceptions
      .filter((entry) => entry.expires >= today)
      .map((entry) => [`${entry.package}:${entry.severity}`, entry]),
  );

  const unreviewed = highFindings.filter((finding) => {
    const exact = activeExceptions.get(`${finding.name}:${finding.severity}`);
    if (exact) return false;

    const advisoryNames = findingAdvisoryNames(finding);
    return ![...activeExceptions.values()].some((entry) => {
      if (entry.severity !== finding.severity) return false;
      if (entry.package === finding.name) return true;
      return advisoryNames.some((name) => entry.advisories?.includes(name));
    });
  });

  return {
    scope: 'production runtime dependencies (dev and optional build tooling omitted)',
    generatedAt: new Date().toISOString(),
    highCriticalFindings: highFindings.map((finding) => ({
      name: finding.name,
      severity: finding.severity,
      range: finding.range ?? null,
      advisories: findingAdvisoryNames(finding),
    })),
    exceptionFailures,
    unreviewed: unreviewed.map((finding) => ({
      name: finding.name,
      severity: finding.severity,
      range: finding.range ?? null,
    })),
    passed: exceptionFailures.length === 0 && unreviewed.length === 0,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArgs(process.argv.slice(2));
  const exceptions = JSON.parse(readFileSync(options.exceptionsFile, 'utf8'));
  const report = loadAuditReport(options.auditFile);
  const summary = evaluateAuditPolicy(report, exceptions);

  console.log(`[audit-check] Scope: ${summary.scope}.`);
  console.log('[audit-check] Current high/critical findings:', JSON.stringify(summary.highCriticalFindings, null, 2));

  if (options.output) {
    writeFileSync(options.output, `${JSON.stringify(summary, null, 2)}\n`);
    console.log(`[audit-check] Wrote policy summary to ${options.output}.`);
  }

  if (summary.exceptionFailures.length > 0) {
    console.error('[audit-check] Failed: malformed or expired audit exceptions remain.');
    for (const failure of summary.exceptionFailures) console.error(`- ${failure}`);
  }

  if (summary.unreviewed.length > 0) {
    console.error('[audit-check] Failed: unreviewed high/critical production vulnerabilities remain.');
    for (const finding of summary.unreviewed) {
      console.error(`- ${finding.name} (${finding.severity}) ${finding.range ?? ''}`);
    }
  }

  if (!summary.passed) process.exit(1);

  console.log('[audit-check] Passed. No unreviewed high/critical production audit findings.');
}
