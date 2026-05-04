import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const SECRET_PATTERNS = [
  /postgres(?:ql)?:\/\/[^@\s]+@/gi,
  /(password|secret|token|key)=([^&\s]+)/gi,
  /(Authorization:\s*Bearer\s+)[A-Za-z0-9._~-]+/gi,
  /(x-hasura-admin-secret:\s*)[^\s]+/gi,
];

export function redact(value) {
  if (value === undefined || value === null) return value;
  let text = String(value);
  for (const pattern of SECRET_PATTERNS) {
    text = text.replace(pattern, (match, prefix) => {
      if (match.startsWith('postgres://') || match.startsWith('postgresql://')) {
        return match.replace(/\/\/[^@\s]+@/, '//[redacted]@');
      }
      return `${prefix ?? ''}[redacted]`;
    });
  }
  return text;
}

export function redactObject(input) {
  if (Array.isArray(input)) return input.map((item) => redactObject(item));
  if (input && typeof input === 'object') {
    return Object.fromEntries(Object.entries(input).map(([key, value]) => {
      if (/secret|token|password|key|dsn|url/i.test(key) && typeof value === 'string') {
        return [key, redact(value)];
      }
      return [key, redactObject(value)];
    }));
  }
  return typeof input === 'string' ? redact(input) : input;
}

export function statusIcon(status) {
  if (status === 'pass') return '✅';
  if (status === 'warn' || status === 'skip') return '⚠️';
  return '❌';
}

export function buildMarkdownReport({ title, generatedAt = new Date().toISOString(), summary = '', checks = [] }) {
  const lines = [`# ${title}`, '', `Generated: ${generatedAt}`, ''];
  if (summary) {
    lines.push(typeof summary === 'string' ? summary : JSON.stringify(summary), '');
  }
  lines.push('| Status | Check | Details |', '| --- | --- | --- |');
  for (const check of checks) {
    lines.push(`| ${statusIcon(check.status)} ${check.status} | ${check.name} | ${String(check.details ?? '').replace(/\n/g, '<br>')} |`);
  }
  lines.push('');
  return lines.join('\n');
}

export function writeReports({ outputDir = 'artifacts/ops', name, report }) {
  mkdirSync(outputDir, { recursive: true });
  const redacted = redactObject(report);
  const jsonPath = path.join(outputDir, `${name}.json`);
  const mdPath = path.join(outputDir, `${name}.md`);
  writeFileSync(jsonPath, `${JSON.stringify(redacted, null, 2)}\n`);
  writeFileSync(mdPath, buildMarkdownReport(redacted));
  return { jsonPath, mdPath };
}

export function hasAllEnv(names, env = process.env) {
  return names.every((name) => Boolean(env[name]));
}

export function parseCommonArgs(argv = process.argv.slice(2)) {
  const options = {
    outputDir: 'artifacts/ops',
    requireSecrets: false,
    execute: false,
    target: process.env.TARGET_ENV || process.env.APP_ENV || 'local',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--output-dir') options.outputDir = argv[++i];
    else if (arg === '--require-secrets') options.requireSecrets = true;
    else if (arg === '--execute') options.execute = true;
    else if (arg === '--target') options.target = argv[++i];
  }

  return options;
}
