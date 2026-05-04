#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const TEXT_FILE_RE = /\.(js|jsx|ts|tsx|mjs|cjs|json|ya?ml|toml|md|env|example|sql|txt|sh|Dockerfile)$/i;
const PLACEHOLDER_RE =
  /^(|REPLACE_ME|CHANGE_ME|example|example-[\w-]+|your[-_\w]*|test[-_\w]*|dummy[-_\w]*|placeholder[-_\w]*|client-secret|test-key|secret|launch-gates-secret|launch-gates-admin-secret|\$\{[A-Z0-9_]+\}|\{\{\s*secrets\.[A-Z0-9_]+\s*\}\})$/i;

const ALLOWLIST = [
  {
    file: 'scripts/check-secret-hygiene.mjs',
    pattern: /GOCSPX|clientSecret|HASURA_GRAPHQL_ADMIN_SECRET|DATABASE_URL|OPENAI_API_KEY|PRIVATE KEY/,
    reason: 'Secret hygiene scanner contains detection regex literals by design.',
  },
  {
    file: 'scripts/check-secret-hygiene.test.mjs',
    pattern:
      /(GOCSPX-|clientSecret\s*[:=]|HASURA_GRAPHQL_ADMIN_SECRET|DATABASE_URL=postgresql:\/\/teachmo:realpassword@db\.example\.com|OPENAI_API_KEY=sk-proj-|-----BEGIN PRIVATE KEY-----)/,
    reason: 'Secret hygiene unit tests intentionally include synthetic prohibited patterns.',
  },
  {
    file: 'nhost/nhost.local.example.toml',
    pattern: /clientSecret = 'REPLACE_ME_LOCAL_ONLY'/,
    reason: 'Local-only example uses an explicit placeholder.',
  },
  {
    file: '.github/workflows/launch-gates.yml',
    pattern: /postgresql:\/\/postgres:postgres@localhost:5432\/teachmo/,
    reason: 'CI-only local Postgres service credential.',
  },
  {
    file: 'backend/__tests__/envCheck.test.js',
    pattern: /NHOST_ADMIN_SECRET = 'secret'/,
    reason: 'Unit test sets a fake secret literal.',
  },
  {
    file: 'nhost/functions/lib/__tests__/weeklyBrief.test.js',
    pattern: /OPENAI_API_KEY = 'test-key'/,
    reason: 'Unit test sets a fake key literal.',
  },
  {
    file: 'backend/__tests__/integrations.test.js',
    pattern: /clientSecret: 'client-secret'/,
    reason: 'Unit test uses an explicit fake client secret.',
  },
  {
    file: 'scripts/check-secret-hygiene.mjs',
    pattern: /NHOST_ADMIN_SECRET = 'secret'/,
    reason: 'The scanner contains fake test patterns in its own allowlist.',
  },
];

const SECRET_PATTERNS = [
  {
    id: 'google-oauth-secret',
    regex: /GOCSPX-[A-Za-z0-9_-]{10,}/,
    reason: 'Google OAuth client secret-looking value must not be tracked.',
  },
  {
    id: 'private-key',
    regex: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/,
    reason: 'Private keys must never be tracked.',
  },
  {
    id: 'database-url-password',
    regex: /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^:\s/@]+:[^@\s/]+@/i,
    reason: 'Database URL contains an embedded password.',
  },
  {
    id: 'slack-token',
    regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}/,
    reason: 'Slack token-looking value must not be tracked.',
  },
  {
    id: 'github-token',
    regex: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}/,
    reason: 'GitHub token-looking value must not be tracked.',
  },
  {
    id: 'openai-key',
    regex: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}/,
    reason: 'OpenAI/API key-looking value must not be tracked.',
  },
  {
    id: 'jwt',
    regex: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
    reason: 'JWT-looking value must not be tracked.',
  },
  {
    id: 'hasura-nhost-admin-secret-assignment',
    regex: /\b(?:HASURA_GRAPHQL_ADMIN_SECRET|NHOST_ADMIN_SECRET|HASURA_GRAPHQL_JWT_SECRET|AUTH_MOCK_SECRET)\s*[:=]\s*['"]?([^'"\s#}][^'"\s#}]*)['"]?/i,
    reason: 'Admin/JWT secret assignments must be placeholders or secret references only.',
    valueGroup: 1,
  },
  {
    id: 'client-secret-assignment',
    regex: /\bclientSecret\s*[:=]\s*['"]([^'"]+)['"]/i,
    reason: 'OAuth/client secret assignments must be placeholders or secret references only.',
    valueGroup: 1,
  },
  {
    id: 'generic-token-assignment',
    regex: /\b(?:accessToken|refreshToken|apiKey|secretKey|jwtSecret|webhookSecret)\s*[:=]\s*['"]([^'"]+)['"]/i,
    reason: 'Token/key/secret assignments must be placeholders or secret references only.',
    valueGroup: 1,
  },
];

function trackedFiles() {
  return execFileSync('git', ['ls-files'], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .filter((file) => TEXT_FILE_RE.test(file) || file.endsWith('Dockerfile') || file.includes('.env.'));
}

function isAllowed(file, line) {
  return ALLOWLIST.some((entry) => entry.file === file && entry.pattern.test(line));
}

function isPlaceholder(value = '') {
  const normalized = String(value).trim();
  return PLACEHOLDER_RE.test(normalized) || normalized.includes('REDACTED') || normalized.includes('UNSAFE_FOR_PRODUCTION');
}

export function detectSecretFindings(inputs) {
  const files = inputs ?? trackedFiles();
  const findings = [];

  for (const input of files) {
    const file = typeof input === 'string' ? input : input.path;
    const text = typeof input === 'string' ? readFileSync(input, 'utf8') : input.content;
    const lines = text.split(/\r?\n/);

    lines.forEach((line, index) => {
      if (isAllowed(file, line)) return;
      for (const pattern of SECRET_PATTERNS) {
        pattern.regex.lastIndex = 0;
        const match = pattern.regex.exec(line);
        if (!match) continue;
        const value = pattern.valueGroup ? match[pattern.valueGroup] : match[0];
        if (pattern.valueGroup && isPlaceholder(value)) continue;
        findings.push({
          file,
          line: index + 1,
          check: pattern.id,
          reason: pattern.reason,
          source: line.trim(),
        });
      }
    });
  }

  return findings;
}

export function runSecretHygieneCheck() {
  const authSafety = spawnSync(process.execPath, ['scripts/check-production-auth-safety.mjs'], {
    stdio: 'inherit',
  });

  if (authSafety.status !== 0) {
    return { status: authSafety.status ?? 1, findings: [] };
  }

  const findings = detectSecretFindings();
  return { status: findings.length ? 1 : 0, findings };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { status, findings } = runSecretHygieneCheck();
  if (findings.length) {
    console.error('Secret hygiene violations found:');
    for (const finding of findings) {
      console.error(`${finding.file}:${finding.line} ${finding.check} ${finding.reason}\n  ${finding.source}`);
    }
  }
  if (status !== 0) process.exit(status);
  console.log(`Secret hygiene check passed (${trackedFiles().length} tracked files scanned).`);
}
