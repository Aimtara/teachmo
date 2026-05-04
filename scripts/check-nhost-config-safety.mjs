#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const DEFAULT_CONFIG = 'nhost/nhost.toml';

const CHECKS = [
  {
    id: 'wildcard-cors',
    regex: /corsDomain\s*=\s*\[[^\]]*['"]\*['"][^\]]*\]/,
    message: 'Hasura CORS must not allow wildcard origins in deployable config.',
  },
  {
    id: 'dev-mode',
    regex: /devMode\s*=\s*true/,
    message: 'Hasura devMode must be disabled for deployable config.',
  },
  {
    id: 'console-enabled',
    regex: /enableConsole\s*=\s*true/,
    message: 'Hasura console must be disabled for deployable config.',
  },
  {
    id: 'allowlist-disabled',
    regex: /enableAllowList\s*=\s*false/,
    message: 'Hasura allowlist must be enabled for deployable config.',
  },
  {
    id: 'public-db-access',
    regex: /enablePublicAccess\s*=\s*true/,
    message: 'Postgres public access must be disabled for deployable config.',
  },
  {
    id: 'anonymous-auth',
    regex: /\[auth\.method\.anonymous\][\s\S]*?enabled\s*=\s*true/,
    message: 'Anonymous auth must be disabled unless a documented production exception is approved.',
  },
  {
    id: 'email-verification-disabled',
    regex: /emailVerificationRequired\s*=\s*false/,
    message: 'Email/password auth must require email verification in production guidance.',
  },
  {
    id: 'hibp-disabled',
    regex: /hibpEnabled\s*=\s*false/,
    message: 'HIBP password breach checks should be enabled in deployable auth config.',
  },
  {
    id: 'conceal-errors-disabled',
    regex: /concealErrors\s*=\s*false/,
    message: 'Auth error concealment should be enabled in deployable config.',
  },
  {
    id: 'pgdump-api-enabled',
    regex: /enabledAPIs\s*=\s*\[[^\]]*['"]pgdump['"][^\]]*\]/,
    message: 'pgdump API should not be enabled in deployable Hasura config.',
  },
];

export function checkNhostConfigSafetyText(text, { file = DEFAULT_CONFIG, localOnly = false } = {}) {
  if (localOnly || /LOCAL_ONLY|local-only|Local development only/i.test(text) || /\.local\.example\.toml$/.test(file)) {
    return [];
  }

  return CHECKS.flatMap((check) => {
    const match = text.match(check.regex);
    if (!match) return [];
    const line = text.slice(0, match.index).split(/\r?\n/).length;
    return [{ file, line, check: check.id, message: check.message }];
  });
}

export function runNhostConfigSafetyCheck(files = [DEFAULT_CONFIG]) {
  const violations = [];
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    violations.push(...checkNhostConfigSafetyText(text, { file }));
  }
  return violations;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const files = process.argv.slice(2);
  const violations = runNhostConfigSafetyCheck(files.length ? files : [DEFAULT_CONFIG]);
  if (violations.length) {
    console.error('Nhost config safety violations found:');
    for (const violation of violations) {
      console.error(`${violation.file}:${violation.line} ${violation.check} ${violation.message}`);
    }
    process.exit(1);
  }
  console.log(`Nhost config safety check passed (${(files.length ? files : [DEFAULT_CONFIG]).join(', ')}).`);
}
