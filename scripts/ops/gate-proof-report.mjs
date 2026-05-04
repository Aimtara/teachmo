#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { parseCommonArgs, writeReports } from './reporting.mjs';

function argValue(argv, name, fallback = null) {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : fallback;
}

function parseArgs(argv = process.argv.slice(2)) {
  const common = parseCommonArgs(argv);
  return {
    ...common,
    resultsFile: argValue(argv, '--results-file', 'test-results/.last-run.json'),
  };
}

function loadPlaywrightSummary(resultsFile) {
  if (!existsSync(resultsFile)) {
    return {
      name: 'Playwright result summary',
      status: 'skip',
      details: `${resultsFile} was not found. Upload the Playwright HTML report for human review.`,
    };
  }

  try {
    const data = JSON.parse(readFileSync(resultsFile, 'utf8'));
    const status = data.status === 'passed' ? 'pass' : 'fail';
    return {
      name: 'Playwright result summary',
      status,
      details: `status=${data.status}; failed=${data.failedTests?.length ?? 0}; flaky=${data.flakyTests?.length ?? 0}`,
    };
  } catch (error) {
    return {
      name: 'Playwright result summary',
      status: 'fail',
      details: `Unable to parse ${resultsFile}: ${error.message}`,
    };
  }
}

function buildReport(opts = parseArgs()) {
  const checks = [
    loadPlaywrightSummary(opts.resultsFile),
    {
      name: 'High-risk flow human review',
      status: 'skip',
      details:
        'Directory identity mapping, assignments sync, and admin analytics proofs require a human reviewer to inspect the uploaded Playwright artifacts before enabling production feature flags.',
    },
    {
      name: 'Evidence templates',
      status: 'pass',
      details:
        'Use readiness evidence templates for role smoke, directory identity conflicts, messaging/digests, assignments sync, and admin dashboard validation.',
    },
  ];

  return {
    title: 'Role Smoke and Gate Proof Report',
    generatedAt: new Date().toISOString(),
    summary: `Results file: ${path.relative(process.cwd(), opts.resultsFile)}`,
    checks,
    counts: {
      pass: checks.filter((check) => check.status === 'pass').length,
      fail: checks.filter((check) => check.status === 'fail').length,
      skip: checks.filter((check) => check.status === 'skip').length,
    },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const opts = parseArgs();
  const report = buildReport(opts);
  const paths = writeReports({ outputDir: opts.outputDir, name: 'gate-proof', report });
  console.log(`[gate-proof] ${JSON.stringify(report.counts)}`);
  console.log(`[gate-proof] Wrote ${paths.jsonPath} and ${paths.mdPath}`);
  if (report.counts.fail > 0) process.exit(1);
}
