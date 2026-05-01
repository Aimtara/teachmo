import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('API boundary check script validates repository allowlisted state', () => {
  const output = execFileSync('node', ['scripts/check-api-boundaries.mjs'], { encoding: 'utf8' });
  assert.match(output, /API boundary check passed/);
});
