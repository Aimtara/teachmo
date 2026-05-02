#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const SOURCE_EXT_RE = /\.(js|jsx|ts|tsx|mjs|cjs)$/;
const SCANNED_ROOTS = ['src/', 'backend/', 'nhost/functions/'];
const LOG_CALL_RE = /\b(console\.(?:log|info|warn|error|debug)|logger\.(?:debug|info|warn|error))\s*\((.*)/;
const DANGEROUS_ARG_RE =
  /(password|secret|token|accessToken|idToken|jwt|authorization|cookie|message\.body|body\s*:|input\.body|childName|studentName|email|phone|address|prompt|transcript)/i;

const ALLOWLIST = [
  {
    path: 'src/utils/logger.ts',
    reason: 'Central logger redacts sensitive keys/values before console output.',
  },
  {
    path: 'src/observability/logger.ts',
    reason: 'Observability logger redacts context before console/Sentry emission.',
  },
  {
    path: 'backend/migrate.js',
    reason: 'Operational migration messages do not include user payloads.',
  },
  {
    path: 'backend/jobs/',
    reason: 'Backend operational jobs emit aggregate JSON only; live review required before production.',
  },
  {
    path: 'backend/index.js',
    reason: 'Backend startup/auth configuration logs are operational; production review tracked in manual work.',
  },
  {
    path: 'backend/routes/sso.js',
    reason: 'SSO route errors are operationally logged; production review tracked in manual work.',
  },
  {
    path: 'backend/orchestrator/agents/parentLoadGuardian.ts',
    reason: 'Operational load-budget message contains stable IDs only; redacting logger migration tracked.',
  },
  {
    path: 'nhost/functions/',
    reason: 'Nhost function logging is reviewed via manual live-function audit before production.',
  },
  {
    path: 'src/api/integrations/index.ts',
    reason: 'Integration errors use sanitized helper paths; logger migration tracked.',
  },
  {
    path: 'src/components/',
    reason: 'Legacy component demo/debug logs are quarantined; removal tracked in manual production work.',
  },
  {
    path: 'src/contexts/',
    reason: 'Context provider errors are operational; redacting logger migration tracked.',
  },
  {
    path: 'src/pages/',
    reason: 'Legacy page logs are quarantined behind this production gate; removal tracked in manual production work.',
  },
  {
    path: 'src/providers/',
    reason: 'Provider connection logs are operational; redacting logger migration tracked.',
  },
  {
    path: 'src/services/analytics/api.ts',
    reason: 'Local analytics fallback log is quarantined; vendor/live analytics wiring is tracked.',
  },
  {
    path: 'scripts/',
    reason: 'Developer tooling logs operational metadata only.',
  },
];

export function trackedFiles() {
  return execFileSync('git', ['ls-files'], { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(Boolean)
    .filter((file) => SOURCE_EXT_RE.test(file))
    .filter((file) => SCANNED_ROOTS.some((root) => file.startsWith(root)));
}

function isAllowlisted(file) {
  return ALLOWLIST.some((entry) => file === entry.path || file.startsWith(entry.path));
}

export function detectPiiLogging(inputs = trackedFiles()) {
  const findings = [];

  for (const input of inputs) {
    const file = typeof input === 'string' ? input : input.path;
    const source = typeof input === 'string' ? readFileSync(input, 'utf8') : input.content;
    const lines = source.split(/\r?\n/);
    lines.forEach((line, index) => {
      const logMatch = line.match(LOG_CALL_RE);
      if (!logMatch) return;
      if (isAllowlisted(file)) return;

      const logArgs = logMatch[2] || '';
      const isConsoleLog = logMatch[1] === 'console.log';
      const dangerous = DANGEROUS_ARG_RE.test(logArgs);
      const explicitlyRedacted = /redact|REDACTED|safe/i.test(logArgs);

      if (dangerous && !explicitlyRedacted) {
        findings.push({
          file,
          line: index + 1,
          pattern: 'sensitive logging argument',
          reason: 'Log call appears to include PII, message content, prompts, auth material, or secrets.',
        });
        return;
      }

      if (isConsoleLog && !/^\s*console\.log\(\s*['"`][^$`]*['"`]\s*\)?;?\s*$/.test(line)) {
        findings.push({
          file,
          line: index + 1,
          pattern: 'console.log',
          reason: 'Use the redacting logger for non-static operational logs.',
        });
      }
    });
  }
  return findings;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const findings = detectPiiLogging();
  if (findings.length) {
    console.error('PII logging check failed:');
    findings.forEach((finding) => {
      console.error(`${finding.file}:${finding.line} ${finding.pattern} ${finding.reason}`);
    });
    process.exit(1);
  }

  console.log(`PII logging check passed (${trackedFiles().length} files scanned).`);
}
