import test from 'node:test';
import assert from 'node:assert/strict';
import { detectPiiLogging } from './check-pii-logging.mjs';

test('detectPiiLogging flags sensitive console output', () => {
  const findings = detectPiiLogging([
    {
      path: 'src/example.ts',
      content: "console.log('email', user.email);\nlogger.info('safe status');",
    },
  ]);

  assert.equal(findings.length, 1);
  assert.match(findings[0].reason, /PII/);
});

test('detectPiiLogging allows redacted logging', () => {
  const findings = detectPiiLogging([
    {
      path: 'src/example.ts',
      content: "logger.info('email redacted', '[REDACTED]');",
    },
  ]);

  assert.equal(findings.length, 0);
});
