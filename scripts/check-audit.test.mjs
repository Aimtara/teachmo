import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  evaluateAuditPolicy,
  validateAuditExceptions,
} from './check-audit.mjs';

const validConfig = {
  generated: '2026-05-04',
  policy: {
    defaultAuditCommand: 'npm audit --audit-level=high --omit=dev --omit=optional',
    reason: 'Runtime gate',
  },
  exceptions: [
    {
      package: 'example-runtime',
      advisories: ['GHSA-aaaa-bbbb-cccc'],
      severity: 'high',
      exposure: 'production runtime dependency',
      reason: 'No patched version is available without breaking launch-critical auth.',
      mitigation: 'Compensating WAF rule and endpoint-level validation are active.',
      owner: 'Security Owner',
      expires: '2099-01-01',
      reviewCommand: 'npm run check:audit',
    },
  ],
};

test('validateAuditExceptionConfig accepts complete active exceptions', () => {
  const issues = validateAuditExceptions(validConfig, { today: '2026-05-04' });
  assert.deepEqual(issues, []);
});

test('validateAuditExceptionConfig rejects malformed and expired exceptions', () => {
  const issues = validateAuditExceptions(
    {
      exceptions: [
        {
          package: 'expired-package',
          advisories: [],
          severity: 'critical',
          exposure: '',
          reason: '',
          mitigation: '',
          owner: '',
          expires: '2020-01-01',
        },
        {
          package: 'bad-severity',
          advisories: ['GHSA-test'],
          severity: 'important',
          exposure: 'runtime',
          reason: 'test',
          mitigation: 'test',
          owner: 'test',
          expires: '2099-01-01',
        },
      ],
    },
    { today: '2026-05-04' },
  );

  assert.ok(issues.some((issue) => issue.includes('expired-package')));
  assert.ok(issues.some((issue) => issue.includes('expired')));
  assert.ok(issues.some((issue) => issue.includes('bad-severity')));
  assert.ok(issues.some((issue) => issue.includes('severity')));
});

test('evaluateAuditPolicy requires active package/severity exception', () => {
  const report = {
    vulnerabilities: {
      ok: { name: 'example-runtime', severity: 'high', via: [] },
      wrongSeverity: { name: 'example-runtime', severity: 'critical', via: [] },
      missing: { name: 'other-runtime', severity: 'high', via: [] },
    },
  };

  const summary = evaluateAuditPolicy(report, validConfig, { today: '2026-05-04' });
  assert.deepEqual(summary.unreviewed, [
    { name: 'example-runtime', severity: 'critical', range: null },
    { name: 'other-runtime', severity: 'high', range: null },
  ]);
  assert.equal(summary.passed, false);
});
