#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const mode = process.argv.includes('--test') ? 'test' : 'check';
const fixture = process.env.CHECK_PRODUCTION_AUTH_FIXTURE;

const files =
  mode === 'test' && fixture
    ? [fixture]
    : execFileSync('git', ['ls-files'], { encoding: 'utf8' })
        .split('\n')
        .filter(Boolean)
        .filter((file) => /\.(js|jsx|ts|tsx|mjs|cjs|md|ya?ml|env|example|toml|json)$/.test(file));

const frontendFile = (file) =>
  file.startsWith('src/') &&
  !file.startsWith('src/domains/') &&
  !file.startsWith('src/domain/') &&
  !file.startsWith('src/services/') &&
  !file.startsWith('src/api/') &&
  !file.startsWith('src/lib/nhostClient') &&
  !file.includes('__tests__');

const ALLOWLIST = [
  {
    file: '.env.example',
    pattern: 'HASURA_GRAPHQL_ADMIN_SECRET',
    reason: 'Server-side runtime secret documented in root example; not VITE-prefixed.',
  },
  {
    file: '.github/workflows/launch-gates.yml',
    pattern: 'AUTH_MODE: mock',
    reason: 'Launch-gates CI intentionally uses mock backend auth in NODE_ENV=test.',
  },
  {
    file: '.github/workflows/launch-gates.yml',
    pattern: 'VITE_E2E_BYPASS_AUTH: "true"',
    reason: 'Launch-gates CI intentionally enables frontend e2e bypass for test smoke only.',
  },
  {
    file: '.github/workflows/launch-gates.yml',
    pattern: 'VITE_OPS_ADMIN_KEY|x-ops-admin-key|OPS_ADMIN_KEY',
    reason: 'Launch-gates invokes the secret hygiene scanner pattern; it is not setting a client secret.',
  },
  {
    file: 'src/config/env.ts',
    pattern: 'VITE_.*(SECRET|TOKEN|PASSWORD|KEY)',
    reason: 'Auth-safety checker documents and detects forbidden client env key patterns.',
  },
  {
    file: 'scripts/check-production-auth-safety.mjs',
    pattern: 'VITE_',
    reason: 'This script intentionally contains forbidden patterns so it can detect them.',
  },
];

const checks = [
  {
    id: 'secret-looking-vite-env',
    regex: /\bVITE_[A-Z0-9_]*(SECRET|TOKEN|PASSWORD|KEY)\b/,
    applies: () => true,
    reason: 'Client-visible VITE_* variable name looks secret-bearing.',
  },
  {
    id: 'frontend-admin-secret',
    regex: /\b(NHOST_ADMIN_SECRET|HASURA_GRAPHQL_ADMIN_SECRET|OPS_ADMIN_KEY|x-ops-admin-key)\b/i,
    applies: frontendFile,
    reason: 'Admin/server secret or admin header appears in frontend code.',
  },
  {
    id: 'prod-bypass-enabled',
    regex: /(VITE_[A-Z0-9_]*BYPASS[A-Z0-9_]*\s*=\s*["']?true|AUTH_MODE\s*[:=]\s*["']?mock)/i,
    applies: (file, text) => /prod|production|staging|stage/i.test(file) || /VITE_APP_ENV\s*=\s*(production|staging)/i.test(text),
    reason: 'Bypass/mock auth appears enabled in production/staging config or documentation.',
  },
  {
    id: 'mock-auth-prod-doc',
    regex: /AUTH_MODE\s*[:=]\s*["']?mock/i,
    applies: (file, text) => /\.(md|ya?ml|env|example)$/.test(file) && /production|staging/i.test(text),
    reason: 'Mock auth appears near production/staging docs/config without an explicit unsafe marker.',
  },
];

function allowed(file, line) {
  return ALLOWLIST.some((entry) => file === entry.file && new RegExp(entry.pattern).test(line));
}

const violations = [];
for (const file of files) {
  let text = '';
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  const lines = text.split('\n');
  lines.forEach((line, idx) => {
    for (const check of checks) {
      if (!check.applies(file, text)) continue;
      if (check.regex.test(line) && !allowed(file, line) && !/unsafe for prod|never enable in production|test only/i.test(line)) {
        violations.push({ file, line: idx + 1, check: check.id, reason: check.reason, source: line.trim() });
      }
    }
  });
}

if (violations.length) {
  console.error('Production auth safety violations found:');
  for (const v of violations) {
    console.error(`${v.file}:${v.line} ${v.check} ${v.reason}\n  ${v.source}`);
  }
  process.exit(1);
}

console.log(`Production auth safety check passed (${files.length} files scanned).`);
