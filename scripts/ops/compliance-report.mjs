#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';

import { parseCommonArgs, redact, writeReports } from './reporting.mjs';

function argValue(argv, name, fallback = null) {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : fallback;
}

function parseArgs(argv = process.argv.slice(2)) {
  const common = parseCommonArgs(argv);
  return {
    ...common,
    requireGitleaks: argv.includes('--require-gitleaks') || process.env.REQUIRE_GITLEAKS === 'true',
    skipGitleaks: argv.includes('--skip-gitleaks') || process.env.SKIP_GITLEAKS_IN_REPORT === 'true',
    aiTestPattern: argValue(
      argv,
      '--ai-tests',
      process.env.AI_GOVERNANCE_TESTS ||
        'backend/__tests__/governance.runtime.test.js backend/__tests__/governance.policy.test.js backend/__tests__/ai.enforcement.test.js',
    ),
  };
}

function runShellCheck(name, command, { required = true } = {}) {
  try {
    const output = execFileSync('bash', ['-lc', command], {
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return {
      name,
      status: 'pass',
      details: redact(output.trim().split('\n').slice(-8).join('\n') || `${command} completed.`),
    };
  } catch (error) {
    return {
      name,
      status: required ? 'fail' : 'skip',
      details: redact(error.stderr || error.stdout || error.message),
    };
  }
}

function commandExists(command) {
  return spawnSync('bash', ['-lc', `command -v ${command}`], { encoding: 'utf8' }).status === 0;
}

export function buildComplianceReport(opts = parseArgs()) {
  const checks = [
    runShellCheck('Secret hygiene scan', 'npm run check:secret-hygiene'),
    runShellCheck('PII logging scan', 'npm run check:pii-logging'),
    runShellCheck('AI governance backend tests', `npx jest --config jest.backend.config.cjs --runInBand ${opts.aiTestPattern}`),
  ];

  if (opts.skipGitleaks) {
    checks.push({
      name: 'Gitleaks repository scan',
      status: 'skip',
      details:
        'Skipped in this report because the dedicated gitleaks action already ran in this workflow. Review the gitleaks step outcome and uploaded artifact for evidence.',
    });
  } else if (commandExists('gitleaks')) {
    checks.push(runShellCheck('Gitleaks repository scan', 'gitleaks detect --source . --redact --no-git --verbose'));
  } else {
    checks.push({
      name: 'Gitleaks repository scan',
      status: opts.requireGitleaks ? 'fail' : 'skip',
      details:
        'gitleaks CLI is not installed in this local context. CI uses the gitleaks action; set REQUIRE_GITLEAKS=true to fail closed.',
    });
  }

  checks.push({
    name: 'Human compliance review packet',
    status: 'pass',
    details:
      'Automated report covers static secret/PII scans and AI governance tests. COPPA/FERPA/legal/vendor approvals remain human-reviewed evidence.',
  });

  const result = {
    pass: checks.filter((check) => check.status === 'pass').length,
    fail: checks.filter((check) => check.status === 'fail').length,
    skip: checks.filter((check) => check.status === 'skip').length,
  };

  return {
    title: 'Compliance and AI Governance Report',
    generatedAt: new Date().toISOString(),
    summary: `Automated controls: secret hygiene, PII logging, AI governance tests, optional gitleaks scan. Result: ${JSON.stringify(result)}.`,
    checks,
    result,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const opts = parseArgs();
  const report = buildComplianceReport(opts);
  const paths = writeReports({ outputDir: opts.outputDir, name: 'compliance-ai-governance', report });
  console.log(`[compliance] ${JSON.stringify(report.result)}`);
  console.log(`[compliance] Wrote ${paths.jsonPath} and ${paths.mdPath}`);
  if (report.result.fail > 0) process.exit(1);
}
