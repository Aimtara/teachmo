#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const BASELINE_PATH = new URL('../docs/readiness/ts-ratchet-baseline.json', import.meta.url);
const exts = ['js', 'jsx', 'ts', 'tsx'];

function trackedFiles() {
  return execFileSync('git', ['ls-files', '*.js', '*.jsx', '*.ts', '*.tsx'], { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(Boolean);
}

export function computeCounts(files = trackedFiles(), read = (file) => readFileSync(file, 'utf8')) {
  const counts = {
    js: 0,
    jsx: 0,
    ts: 0,
    tsx: 0,
    any: 0,
    tsIgnore: 0,
    tsExpectError: 0,
  };

  for (const file of files) {
    const ext = file.split('.').pop();
    if (!exts.includes(ext)) continue;
    counts[ext] += 1;
    if (ext === 'ts' || ext === 'tsx') {
      const source = read(file);
      counts.any += (source.match(/\bany\b/g) ?? []).length;
      counts.tsIgnore += (source.match(/@ts-ignore/g) ?? []).length;
      counts.tsExpectError += (source.match(/@ts-expect-error/g) ?? []).length;
    }
  }

  return counts;
}

function loadBaseline() {
  return JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
}

export function compareCounts(current, baseline) {
  const budgets = baseline.budgets ?? {};
  const checks = [
    ['js', 'allowJsIncrease'],
    ['jsx', 'allowJsxIncrease'],
    ['any', 'allowAnyIncrease'],
    ['tsIgnore', 'allowTsIgnoreIncrease'],
    ['tsExpectError', 'allowTsExpectErrorIncrease'],
  ];

  const failures = [];
  for (const [countKey, budgetKey] of checks) {
    const allowed = Number(budgets[budgetKey] ?? 0);
    const delta = Number(current[countKey] ?? 0) - Number(baseline.counts?.[countKey] ?? 0);
    if (delta > allowed) {
      failures.push({
        countKey,
        baseline: baseline.counts?.[countKey] ?? 0,
        current: current[countKey] ?? 0,
        delta,
        allowed,
      });
    }
  }
  return failures;
}

export function run() {
  const baseline = loadBaseline();
  const current = computeCounts();
  const failures = compareCounts(current, baseline);

  console.log('[ts-ratchet] Current counts:', JSON.stringify(current));
  console.log('[ts-ratchet] Baseline counts:', JSON.stringify(baseline.counts));

  if (failures.length > 0) {
    console.error('[ts-ratchet] Regression detected:');
    for (const f of failures) {
      console.error(
        `  ${f.countKey}: baseline=${f.baseline} current=${f.current} delta=${f.delta} allowed=${f.allowed}`
      );
    }
    console.error('Update TypeScript migration docs and baseline only for intentional, reviewed exceptions.');
    return 1;
  }

  console.log('[ts-ratchet] Passed.');
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = run();
}
