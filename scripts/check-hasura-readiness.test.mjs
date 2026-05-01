import test from 'node:test';
import assert from 'node:assert/strict';
import { checkHasuraReadiness } from './check-hasura-readiness.mjs';

test('Hasura readiness script reports required repository artifacts', () => {
  const result = checkHasuraReadiness({ root: process.cwd(), silent: true });
  assert.equal(result.ok, true);
  assert.equal(result.missingFiles.length, 0);
  assert.ok(result.migrationCount > 0);
  assert.ok(result.tableMetadataCount > 0);
});
