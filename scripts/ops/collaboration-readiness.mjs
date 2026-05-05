#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import process from 'node:process';

import { parseCommonArgs, redact, writeReports } from './reporting.mjs';

const DEFAULT_POLICY_PATH = 'config/collaboration-readiness.json';

function argValue(argv, name, fallback = null) {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : fallback;
}

function parseArgs(argv = process.argv.slice(2)) {
  const common = parseCommonArgs(argv);
  return {
    ...common,
    policyPath: argValue(argv, '--policy', DEFAULT_POLICY_PATH),
    strict: argv.includes('--strict'),
    checkGithub: argv.includes('--check-github'),
    requirePreview: argv.includes('--require-preview'),
    requireVisual: argv.includes('--require-visual'),
    requireSynthetics: argv.includes('--require-synthetics'),
    requireGithubApi: argv.includes('--require-github-api'),
  };
}

function loadPolicy(policyPath) {
  return JSON.parse(readFileSync(policyPath, 'utf8'));
}

function check(name, status, details) {
  return { name, status, details };
}

function requiredStatus(missing, required) {
  if (missing.length === 0) return 'pass';
  return required ? 'fail' : 'warn';
}

function envPresent(name) {
  return Boolean(process.env[name]);
}

function groupPresence(group) {
  const required = group.required ?? [];
  const anyOf = group.anyOf ?? [];
  const missingRequired = required.filter((name) => !envPresent(name));
  const anyOfConfigured = anyOf.length === 0 || anyOf.some((name) => envPresent(name));
  const missing = [
    ...missingRequired,
    ...(anyOfConfigured ? [] : [`one of: ${anyOf.join(', ')}`]),
  ];
  return {
    label: group.label ?? group.id,
    configured: missing.length === 0,
    variables: [...required, ...anyOf],
    missing,
  };
}

function validateWorkflows(policy) {
  return (policy.requiredWorkflows ?? []).map((workflow) =>
    check(
      `Workflow exists: ${workflow}`,
      existsSync(workflow) ? 'pass' : 'fail',
      existsSync(workflow)
        ? `${workflow} is present.`
        : `${workflow} is missing.`,
    ),
  );
}

function validateRenovate(policy) {
  const checks = [];
  if (!existsSync('renovate.json')) {
    return [check('Renovate config exists', 'fail', 'renovate.json is missing.')];
  }

  let config;
  try {
    config = JSON.parse(readFileSync('renovate.json', 'utf8'));
    checks.push(check('Renovate JSON parses', 'pass', 'renovate.json parsed successfully.'));
  } catch (error) {
    return [check('Renovate JSON parses', 'fail', error.message)];
  }

  const rules = config.packageRules ?? [];
  const automergeRules = rules.filter((rule) => rule.automerge === true || rule.platformAutomerge === true);
  const unsafeAutomerge = automergeRules.filter((rule) => {
    const depTypes = rule.matchDepTypes ?? [];
    const updateTypes = rule.matchUpdateTypes ?? [];
    return !depTypes.includes('devDependencies') || !updateTypes.includes('patch');
  });
  checks.push(
    check(
      'Renovate automerge scope',
      unsafeAutomerge.length ? 'fail' : 'pass',
      unsafeAutomerge.length
        ? `${unsafeAutomerge.length} automerge rule(s) are broader than devDependency patches.`
        : 'Automerge is limited to devDependency patch updates.',
    ),
  );

  const requiredChecks = policy.renovate?.devPatchRequiredStatusChecks ?? [];
  const configuredChecks = new Set(automergeRules.flatMap((rule) => rule.requiredStatusChecks ?? []));
  const missingChecks = requiredChecks.filter((name) => !configuredChecks.has(name));
  checks.push(
    check(
      'Renovate automerge required status checks',
      missingChecks.length ? 'fail' : 'pass',
      missingChecks.length
        ? `Missing requiredStatusChecks: ${missingChecks.join(', ')}`
        : `Configured requiredStatusChecks: ${requiredChecks.join(', ')}`,
    ),
  );

  const runtimeRule = rules.find((rule) => (rule.matchDepTypes ?? []).includes('dependencies') && rule.automerge === false);
  checks.push(
    check(
      'Renovate runtime dependencies require review',
      runtimeRule ? 'pass' : 'fail',
      runtimeRule ? 'Runtime dependency updates are not automerged.' : 'No runtime dependency review rule found.',
    ),
  );

  const securityRule = rules.find((rule) => (rule.matchCategories ?? []).includes('security') && rule.automerge === false);
  checks.push(
    check(
      'Renovate security updates require review',
      securityRule ? 'pass' : 'fail',
      securityRule ? 'Security updates are not automerged.' : 'No non-automerge security update rule found.',
    ),
  );

  const majorRule = rules.find((rule) => (rule.matchUpdateTypes ?? []).includes('major') && rule.dependencyDashboardApproval === true);
  checks.push(
    check(
      'Renovate major updates require dashboard approval',
      majorRule ? 'pass' : 'fail',
      majorRule ? 'Major updates require dashboard approval.' : 'No major-update dashboard approval rule found.',
    ),
  );

  return checks;
}

function parseCodeownersLines(text) {
  return text
    .split('\n')
    .map((line, index) => ({ line: line.trim(), number: index + 1 }))
    .filter(({ line }) => line && !line.startsWith('#'));
}

function validateCodeowners(policy, opts) {
  if (!existsSync('.github/CODEOWNERS')) {
    return [check('CODEOWNERS exists', 'fail', '.github/CODEOWNERS is missing.')];
  }

  const text = readFileSync('.github/CODEOWNERS', 'utf8');
  const entries = parseCodeownersLines(text);
  const malformed = entries.filter(({ line }) => {
    const parts = line.split(/\s+/);
    if (parts.length < 2) return true;
    return parts.slice(1).some((owner) => !owner.startsWith('@') && !owner.includes('@'));
  });
  const placeholderPatterns = (policy.ownerPlaceholders ?? policy.codeowners?.placeholderOwnerPatterns ?? []).map((pattern) => new RegExp(pattern));
  const placeholders = entries.flatMap(({ line, number }) =>
    line
      .split(/\s+/)
      .slice(1)
      .filter((owner) => placeholderPatterns.some((pattern) => pattern.test(owner)))
      .map((owner) => `${owner} (line ${number})`),
  );

  return [
    check('CODEOWNERS exists', 'pass', '.github/CODEOWNERS is present.'),
    check(
      'CODEOWNERS syntax smoke',
      malformed.length ? 'fail' : 'pass',
      malformed.length
        ? `Malformed owner entries: ${malformed.map((item) => `line ${item.number}`).join(', ')}`
        : `${entries.length} ownership entries have path + owner tokens.`,
    ),
    check(
      'CODEOWNERS placeholders replaced',
      placeholders.length ? (opts.strict ? 'fail' : 'warn') : 'pass',
      placeholders.length
        ? `Placeholder owners remain: ${placeholders.join(', ')}`
        : 'No placeholder owner patterns found.',
    ),
  ];
}

function validateSecretGroups(policy, opts) {
  const checks = [];
  const groups = policy.secretGroups ?? [];
  const requiredCapabilities = new Set();
  if (opts.requirePreview) requiredCapabilities.add('preview');
  if (opts.requireVisual) requiredCapabilities.add('visual');
  if (opts.requireSynthetics) requiredCapabilities.add('synthetics');
  if (opts.strict) {
    for (const group of groups) {
      if (group.requiredInStrict) requiredCapabilities.add(group.capability);
    }
  }

  for (const group of groups) {
    const presence = groupPresence(group);
    const required = requiredCapabilities.has(group.capability);
    checks.push(
      check(
        `External setup: ${presence.label}`,
        presence.configured ? 'pass' : requiredStatus(presence.missing, required),
        presence.configured
          ? `${group.id} capability is configured.`
          : `Missing ${presence.missing.length} variable(s): ${presence.missing.join(', ')}`,
      ),
    );
  }

  const previewGroups = groups
    .filter((group) => group.capability === 'preview')
    .map((group) => [group.id, groupPresence(group)]);
  if (previewGroups.length > 0) {
    const configured = previewGroups.filter(([, presence]) => presence.configured).map(([key]) => key);
    checks.push(
      check(
        'Preview provider configured',
        configured.length ? 'pass' : opts.requirePreview || opts.strict ? 'fail' : 'warn',
        configured.length
          ? `Configured preview provider group(s): ${configured.join(', ')}`
          : 'No complete preview provider group found. Configure Vercel or Netlify secrets.',
      ),
    );
  }

  return checks;
}

function runGhApi(path) {
  try {
    const stdout = execFileSync('gh', ['api', path], { encoding: 'utf8', maxBuffer: 5 * 1024 * 1024 });
    return { ok: true, data: JSON.parse(stdout) };
  } catch (error) {
    return {
      ok: false,
      message: redact(error.stderr || error.stdout || error.message),
    };
  }
}

function validateGithub(policy, opts) {
  if (!opts.checkGithub && !opts.requireGithubApi) {
    return [check('GitHub API checks', 'skip', 'Run with --check-github to inspect branch protection/code scanning using read-only API access.')];
  }

  const repo = process.env.GITHUB_REPOSITORY || policy.github?.repository || 'Aimtara/teachmo';
  const defaultBranch = policy.defaultBranch ?? policy.github?.defaultBranch ?? 'main';
  if (!repo) {
    return [check('GitHub repository resolved', opts.requireGithubApi ? 'fail' : 'warn', 'GITHUB_REPOSITORY or policy.github.repository is required.')];
  }

  const checks = [];
  const branchProtection = runGhApi(`repos/${repo}/branches/${defaultBranch}/protection`);
  checks.push(
    check(
      'GitHub branch protection readable',
      branchProtection.ok ? 'pass' : opts.requireGithubApi ? 'fail' : 'warn',
      branchProtection.ok
        ? `Branch protection for ${defaultBranch} is readable.`
        : `Could not read branch protection for ${defaultBranch}: ${branchProtection.message}`,
    ),
  );

  if (branchProtection.ok) {
    const requiredChecks =
      branchProtection.data?.required_status_checks?.contexts ??
      branchProtection.data?.required_status_checks?.checks?.map((item) => item.context || item.name).filter(Boolean) ??
      [];
    const expectedChecks = policy.requiredChecks ?? policy.branchProtection?.requiredChecks ?? [];
    const missing = expectedChecks.filter((name) => !requiredChecks.includes(name));
    checks.push(
      check(
        'GitHub branch protection required checks',
        missing.length ? (opts.strict ? 'fail' : 'warn') : 'pass',
        missing.length
          ? `Missing required checks: ${missing.join(', ')}. Current checks: ${requiredChecks.join(', ') || 'none'}`
          : `Expected checks are configured: ${expectedChecks.join(', ')}`,
      ),
    );
    const reviews = branchProtection.data?.required_pull_request_reviews;
    checks.push(
      check(
        'GitHub branch protection CODEOWNER reviews',
        reviews?.require_code_owner_reviews ? 'pass' : opts.strict ? 'fail' : 'warn',
        reviews?.require_code_owner_reviews
          ? 'CODEOWNER review is required.'
          : 'CODEOWNER review is not required or could not be detected.',
      ),
    );
  }

  const codeScanning = runGhApi(`repos/${repo}/code-scanning/alerts?per_page=1`);
  checks.push(
    check(
      'GitHub code scanning API readable',
      codeScanning.ok ? 'pass' : opts.requireGithubApi ? 'fail' : 'warn',
      codeScanning.ok ? 'Code scanning alerts API is readable.' : `Could not read code scanning alerts: ${codeScanning.message}`,
    ),
  );

  return checks;
}

export function buildCollaborationReadinessReport(opts = parseArgs()) {
  const policy = loadPolicy(opts.policyPath);
  const checks = [
    check('Collaboration readiness policy exists', existsSync(opts.policyPath) ? 'pass' : 'fail', opts.policyPath),
    ...validateWorkflows(policy),
    ...validateRenovate(policy),
    ...validateCodeowners(policy, opts),
    ...validateSecretGroups(policy, opts),
    ...validateGithub(policy, opts),
  ];

  return {
    title: 'Collaboration Readiness',
    generatedAt: new Date().toISOString(),
    summary: `Strict mode: ${opts.strict ? 'enabled' : 'disabled'}. GitHub API checks: ${opts.checkGithub || opts.requireGithubApi ? 'enabled' : 'disabled'}.`,
    checks,
    totals: {
      pass: checks.filter((item) => item.status === 'pass').length,
      fail: checks.filter((item) => item.status === 'fail').length,
      warn: checks.filter((item) => item.status === 'warn').length,
      skip: checks.filter((item) => item.status === 'skip').length,
    },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const opts = parseArgs();
  const report = buildCollaborationReadinessReport(opts);
  const paths = writeReports({ outputDir: opts.outputDir, name: 'collaboration-readiness', report });
  console.log(`[collaboration-readiness] ${JSON.stringify(report.totals)}`);
  console.log(`[collaboration-readiness] Wrote ${paths.jsonPath} and ${paths.mdPath}`);
  if (report.totals.fail > 0) process.exit(1);
}
