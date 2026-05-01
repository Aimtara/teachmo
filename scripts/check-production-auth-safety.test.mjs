import test from 'node:test';
import assert from 'node:assert/strict';
import { checkAuthSafetyText } from './check-production-auth-safety.mjs';

test('production auth safety flags client secrets and prod bypasses', () => {
  const secretName = 'VITE_' + 'INTERNAL_API_KEY';
  const violations = checkAuthSafetyText('src/App.tsx', `const x = import.meta.env.${secretName};`);
  assert.equal(violations.length, 1);
  assert.match(violations[0].reason, /secret-bearing/);

  const envViolations = checkAuthSafetyText('.env.production', 'VITE_E2E_' + 'BYPASS_AUTH=true');
  assert.equal(envViolations.length, 1);
  assert.match(envViolations[0].reason, /production/);
});

test('production auth safety allows explicit unsafe examples in docs', () => {
  const violations = checkAuthSafetyText('docs/example.md', 'AUTH_MODE=mock # UNSAFE FOR PROD');
  assert.equal(violations.length, 0);
});
