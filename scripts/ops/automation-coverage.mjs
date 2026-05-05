#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { parseCommonArgs, writeReports } from './reporting.mjs';

const DEFAULT_CONFIG_PATH = 'config/automation-coverage.json';
const GRAPHQL_OPERATION_PATTERN = /\b(query|mutation|subscription)\s+([A-Za-z_][A-Za-z0-9_]*)?\s*(?:\([^)]*\))?\s*\{/g;
const DYNAMIC_GRAPHQL_PATTERN = /`[^`]*(?:query|mutation|subscription)[^`]*\$\{[^`]+`/gs;

function argValue(argv, name, fallback = null) {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : fallback;
}

function parseArgs(argv = process.argv.slice(2)) {
  const common = parseCommonArgs(argv);
  return {
    ...common,
    configPath: argValue(argv, '--config', DEFAULT_CONFIG_PATH),
    strict: argv.includes('--strict'),
    allowGraphqlBacklog: argv.includes('--allow-graphql-backlog'),
  };
}

function trackedFiles(patterns) {
  const expandedPatterns = patterns.flatMap((pattern) => expandBracePattern(pattern));
  const out = execFileSync('git', ['ls-files'], { encoding: 'utf8' });
  const regexes = expandedPatterns.map((pattern) => globToRegex(pattern));
  return out.split('\n').filter(Boolean);
}

function expandBracePattern(pattern) {
  const match = pattern.match(/\{([^{}]+)\}/);
  if (!match) return [pattern];
  return match[1].split(',').flatMap((part) => expandBracePattern(pattern.replace(match[0], part)));
}

function check(name, status, details, extra = {}) {
  return { name, status, details, ...extra };
}

function loadConfig(configPath) {
  return JSON.parse(readFileSync(configPath, 'utf8'));
}

function globToRegex(glob) {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '::DOUBLE_STAR::')
    .replace(/\*/g, '[^/]*')
    .replace(/::DOUBLE_STAR::/g, '.*');
  return new RegExp(`^${escaped}$`);
}

function matchesAny(file, patterns) {
  return patterns.some((pattern) => globToRegex(pattern).test(file));
}

function lineForIndex(text, index) {
  return text.slice(0, index).split('\n').length;
}

function validateVisualCoverage(config) {
  const storyFiles = trackedFiles(['src/**/*.stories.*']);
  const checks = [];

  for (const surface of config.visualSurfaces ?? []) {
    const expectedStories = surface.requiredStories ?? [];
    const matches = expectedStories.filter((file) => storyFiles.includes(file));
    const missing = expectedStories.filter((file) => !storyFiles.includes(file));
    const required = surface.required !== false;
    checks.push(
      check(
        `Visual coverage: ${surface.label}`,
        missing.length ? (required ? 'fail' : 'warn') : 'pass',
        missing.length
          ? `Missing required story file(s): ${missing.join(', ')}`
          : `${matches.length} required story file(s) present: ${matches.join(', ')}`,
        { surface: surface.id, matches, missing },
      ),
    );
  }

  return checks;
}

function validateSyntheticCoverage(config) {
  const testFiles = trackedFiles(['tests/e2e/**/*.spec.ts', 'tests/e2e/**/*.spec.js']);
  const checks = [];

  for (const journey of config.syntheticJourneys ?? []) {
    const matchingFiles = testFiles.filter((file) => file === journey.spec);
    const haystack = matchingFiles.map((file) => readFileSync(file, 'utf8')).join('\n');
    const missing = (journey.requiredPaths ?? []).filter((requiredPath) => !haystack.includes(requiredPath));
    const missingEnvPrefixes = (journey.requiredEnvPrefixes ?? []).filter((prefix) => !haystack.includes(prefix));
    const allMissing = [...missing, ...missingEnvPrefixes.map((prefix) => `${prefix}* env usage`)];
    checks.push(
      check(
        `Synthetic coverage: ${journey.label}`,
        allMissing.length ? 'fail' : 'pass',
        allMissing.length
          ? `Missing expected route/env marker(s): ${allMissing.join(', ')} in ${matchingFiles.join(', ') || 'no test files'}.`
          : `Covered by ${matchingFiles.join(', ')}.`,
        { journey: journey.id, files: matchingFiles, missingPatterns: allMissing },
      ),
    );
  }

  return checks;
}

function collectGraphqlOperations(config) {
  const files = trackedFiles(config.graphql?.scanGlobs ?? config.graphql?.documentGlobs ?? ['src/**/*.{ts,tsx,js,jsx}', 'nhost/functions/**/*.{ts,js}']);
  const excluded = config.graphql?.excludeGlobs ?? [];
  const operations = [];
  const dynamic = [];
  const unnamed = [];

  for (const file of files) {
    if (matchesAny(file, excluded)) continue;
    const text = readFileSync(file, 'utf8');

    for (const match of text.matchAll(GRAPHQL_OPERATION_PATTERN)) {
      const operation = {
        file,
        line: lineForIndex(text, match.index ?? 0),
        type: match[1],
        name: match[2] || null,
      };
      operations.push(operation);
      if (!operation.name) unnamed.push(operation);
    }

    for (const match of text.matchAll(DYNAMIC_GRAPHQL_PATTERN)) {
      dynamic.push({ file, line: lineForIndex(text, match.index ?? 0) });
    }
  }

  return { operations, dynamic, unnamed };
}

function validateGraphqlInventory(config, opts) {
  const { operations, dynamic, unnamed } = collectGraphqlOperations(config);
  const highRiskGlobs = config.graphql?.highRiskGlobs ?? [];
  const typedAllowlist = new Set(config.graphql?.typedAllowlist ?? []);
  const highRiskOperations = operations.filter((operation) => matchesAny(operation.file, highRiskGlobs));
  const untypedHighRisk = highRiskOperations.filter((operation) => !typedAllowlist.has(`${operation.file}:${operation.name ?? operation.line}`));

  const graphqlGapStatus = (count) => {
    if (!count) return 'pass';
    if (opts.strict && !opts.allowGraphqlBacklog) return 'fail';
    return 'warn';
  };

  return [
    check(
      'GraphQL operation inventory',
      operations.length ? 'pass' : 'warn',
      `${operations.length} operation(s) found across ${new Set(operations.map((operation) => operation.file)).size} file(s).`,
      { operations },
    ),
    check(
      'GraphQL named operations',
      graphqlGapStatus(unnamed.length),
      unnamed.length
        ? `${unnamed.length} unnamed operation(s) found; named operations are easier to type and audit.`
        : 'All discovered operations are named.',
      { unnamed },
    ),
    check(
      'GraphQL dynamic operation templates',
      graphqlGapStatus(dynamic.length),
      dynamic.length
        ? `${dynamic.length} dynamic GraphQL template(s) found; review for codegen compatibility and injection safety.`
        : 'No dynamic GraphQL template interpolation found.',
      { dynamic },
    ),
    check(
      'High-risk GraphQL typed-operation backlog',
      untypedHighRisk.length ? 'warn' : 'pass',
      untypedHighRisk.length
        ? `${untypedHighRisk.length} high-risk operation(s) should be migrated toward generated typed documents.`
        : 'No unallowlisted high-risk GraphQL operations found.',
      { highRiskOperations, untypedHighRisk },
    ),
  ];
}

export function buildAutomationCoverageReport(opts = parseArgs()) {
  const config = loadConfig(opts.configPath);
  const checks = [
    check('Automation coverage config exists', existsSync(opts.configPath) ? 'pass' : 'fail', opts.configPath),
    ...validateVisualCoverage(config),
    ...validateSyntheticCoverage(config),
    ...validateGraphqlInventory(config, opts),
  ];

  const totals = {
    pass: checks.filter((item) => item.status === 'pass').length,
    fail: checks.filter((item) => item.status === 'fail').length,
    warn: checks.filter((item) => item.status === 'warn').length,
    skip: checks.filter((item) => item.status === 'skip').length,
  };

  return {
    title: 'Automation Coverage Audit',
    generatedAt: new Date().toISOString(),
    summary: `Strict mode: ${opts.strict ? 'enabled' : 'disabled'}.`,
    config: path.normalize(opts.configPath),
    checks,
    totals,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const opts = parseArgs();
  const report = buildAutomationCoverageReport(opts);
  const paths = writeReports({ outputDir: opts.outputDir, name: 'automation-coverage', report });
  console.log(`[automation-coverage] ${JSON.stringify(report.totals)}`);
  console.log(`[automation-coverage] Wrote ${paths.jsonPath} and ${paths.mdPath}`);
  if (report.totals.fail > 0 || (opts.strict && !opts.allowGraphqlBacklog && report.totals.warn > 0)) process.exit(1);
}
