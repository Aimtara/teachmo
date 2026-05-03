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

test('detectPiiLogging flags child data, auth headers, prompts, and vendor payload logging', () => {
  const findings = detectPiiLogging([
    {
      path: 'src/example.ts',
      content: [
        "logger.info('child', child.fullName);",
        "logger.warn('auth', request.headers.authorization);",
        "console.error('ai prompt', rawPrompt);",
        "logger.debug('vendor', vendorPayload);",
      ].join('\n'),
    },
  ]);

  assert.equal(findings.length, 4);
});
