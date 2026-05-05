import { spawnSync } from 'node:child_process';

const baseline = {
  errors: 372,
  warnings: 145,
  totalProblems: 517,
  rules: {
    'no-unused-vars': 240,
    'react-hooks/exhaustive-deps': 82,
    'react-refresh/only-export-components': 63,
    '@typescript-eslint/no-explicit-any': 111,
    parser: 0,
    'no-undef': 0,
    'no-redeclare': 7,
    '@typescript-eslint/no-unused-vars': 1,
    'no-case-declarations': 0,
    'react/display-name': 5,
    'react-hooks/rules-of-hooks': 5,
    'react/no-children-prop': 0,
    'no-prototype-builtins': 0,
    'no-unsafe-finally': 2,
    'react/jsx-no-undef': 0,
    'react/no-unknown-property': 1,
    'no-useless-escape': 0,
  },
};

const result = spawnSync(
  'npx',
  ['eslint', 'src', 'backend', '--ext', '.js,.jsx,.ts,.tsx', '--format', 'json'],
  { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 },
);

if (result.error) {
  console.error('[lint-ratchet] Failed to run ESLint:', result.error.message);
  process.exit(1);
}

let reports;
try {
  reports = JSON.parse(result.stdout || '[]');
} catch (error) {
  console.error('[lint-ratchet] Failed to parse ESLint JSON output:', error.message);
  if (result.stderr) console.error(result.stderr);
  process.exit(1);
}

const current = {
  errors: 0,
  warnings: 0,
  totalProblems: 0,
  rules: {},
};

for (const report of reports) {
  current.errors += report.errorCount ?? 0;
  current.warnings += report.warningCount ?? 0;
  for (const message of report.messages ?? []) {
    const ruleId = message.ruleId ?? 'parser';
    current.rules[ruleId] = (current.rules[ruleId] ?? 0) + 1;
    current.totalProblems += 1;
  }
}

const failures = [];

for (const key of ['errors', 'warnings', 'totalProblems']) {
  if (current[key] > baseline[key]) {
    failures.push(`${key} increased: ${current[key]} > ${baseline[key]}`);
  }
}

const allRules = new Set([...Object.keys(baseline.rules), ...Object.keys(current.rules)]);
for (const rule of [...allRules].sort()) {
  const allowed = baseline.rules[rule] ?? 0;
  const actual = current.rules[rule] ?? 0;
  if (actual > allowed) {
    failures.push(`${rule} increased: ${actual} > ${allowed}`);
  }
}

console.log('[lint-ratchet] Current:', JSON.stringify(current, null, 2));
console.log('[lint-ratchet] Baseline:', JSON.stringify(baseline, null, 2));

if (failures.length > 0) {
  console.error('[lint-ratchet] Failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('[lint-ratchet] Passed. Existing lint debt did not increase.');
