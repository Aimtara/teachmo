#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const exceptionPath = new URL('../config/audit-exceptions.json', import.meta.url);
const exceptions = JSON.parse(readFileSync(exceptionPath, 'utf8'));
const today = new Date().toISOString().slice(0, 10);

const result = spawnSync(
  'npm',
  ['audit', '--audit-level=high', '--omit=dev', '--omit=optional', '--json'],
  { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
);

let report;
try {
  report = JSON.parse(result.stdout || '{}');
} catch (error) {
  console.error('[audit-check] Failed to parse npm audit JSON:', error.message);
  if (result.stdout) console.error(result.stdout);
  if (result.stderr) console.error(result.stderr);
  process.exit(1);
}

const vulnerabilities = Object.values(report.vulnerabilities ?? {});
const highFindings = vulnerabilities.filter((finding) => ['high', 'critical'].includes(finding.severity));
const activeExceptions = new Map(
  exceptions.exceptions
    .filter((entry) => entry.expires >= today)
    .map((entry) => [`${entry.package}:${entry.severity}`, entry]),
);

const unreviewed = highFindings.filter((finding) => {
  const exact = activeExceptions.get(`${finding.name}:${finding.severity}`);
  return !exact;
});

console.log('[audit-check] Scope: production runtime dependencies (dev and optional build tooling omitted).');
console.log('[audit-check] Current high/critical findings:', JSON.stringify(highFindings.map((finding) => ({
  name: finding.name,
  severity: finding.severity,
  range: finding.range,
})), null, 2));

if (unreviewed.length > 0) {
  console.error('[audit-check] Failed: unreviewed high/critical production vulnerabilities remain.');
  for (const finding of unreviewed) {
    console.error(`- ${finding.name} (${finding.severity}) ${finding.range ?? ''}`);
  }
  process.exit(1);
}

console.log('[audit-check] Passed. No unreviewed high/critical production audit findings.');
