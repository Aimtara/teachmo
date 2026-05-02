import test from 'node:test';
import assert from 'node:assert/strict';
import { checkHasuraReadiness } from './check-hasura-readiness.mjs';

test('Hasura readiness script reports required repository artifacts', () => {
  const result = checkHasuraReadiness(process.cwd());
  assert.equal(result.missing.length, 0);
  assert.ok(Array.isArray(result.warnings));
});
