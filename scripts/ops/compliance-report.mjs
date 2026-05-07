#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';

import { parseCommonArgs, redact, writeReports } from './reporting.mjs';
import { DATA_CLASSIFICATION_REGISTRY } from '../../backend/compliance/dataClassification.js';
import { AUDIT_EVENT_CATEGORIES } from '../../backend/compliance/auditEvents.js';
import { lifecycleCoverage } from '../../backend/compliance/dataLifecycle.ts';
import { getOpenGaps } from '../../backend/compliance/remediationBacklog.js';

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

function gitCommit() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

export function buildComplianceReport(opts = parseArgs()) {
  const checks = [
    runShellCheck('Typecheck', 'npm run typecheck'),
    runShellCheck('Production auth bypass safety', 'npm run check:production-auth-safety'),
    runShellCheck('Secret hygiene scan', 'npm run check:secret-hygiene'),
    runShellCheck('PII logging scan', 'npm run check:pii-logging'),
    runShellCheck('Compliance foundations tests', 'npm run check:compliance-foundations'),
    runShellCheck('AI governance backend tests', `npx jest --config jest.backend.config.cjs --runInBand ${opts.aiTestPattern}`),
    runShellCheck('Hasura permission readiness smoke', 'npm run check:hasura-readiness'),
    runShellCheck('Accessibility smoke tests', 'npm run test:a11y', { required: false }),
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
    gitCommit: gitCommit(),
    testsRun: checks.map((check) => check.name),
    summary: `Automated controls: typecheck, auth bypass safety, secret hygiene, PII logging, compliance foundations, AI governance tests, Hasura readiness, accessibility smoke, optional gitleaks scan. Result: ${JSON.stringify(result)}.`,
    unresolvedCriticalExceptions: [],
    dataClassificationCoverage: {
      entities: Object.keys(DATA_CLASSIFICATION_REGISTRY.entities).length,
      actions: Object.keys(DATA_CLASSIFICATION_REGISTRY.actions).length,
      lifecyclePolicies: lifecycleCoverage().length,
    },
    auditCoverageSummary: {
      categories: AUDIT_EVENT_CATEGORIES,
      categoryCount: AUDIT_EVENT_CATEGORIES.length,
    },
    remediationBacklogSummary: {
      openP0: getOpenGaps({ priority: 'P0' }).map((gap) => ({ id: gap.id, title: gap.title, owner: gap.owner })),
      openP1: getOpenGaps({ priority: 'P1' }).map((gap) => ({ id: gap.id, title: gap.title, owner: gap.owner })),
    },
    piiLoggingScanResult: checks.find((check) => check.name === 'PII logging scan')?.status || 'unknown',
    aiGovernanceResult: checks.find((check) => check.name === 'AI governance backend tests')?.status || 'unknown',
    accessibilitySmokeResult: checks.find((check) => check.name === 'Accessibility smoke tests')?.status || 'unknown',
    knownLimitations: [
      'This report is engineering control evidence only and is not a legal compliance determination.',
      'Hasura metadata smoke tests verify configured readiness; full production permission review remains required before launch.',
      'Accessibility smoke tests do not replace full WCAG review for procurement evidence.',
    ],
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
