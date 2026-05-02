import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { computeCounts, compareCounts } from './check-ts-ratchet.mjs';

const dir = mkdtempSync(join(tmpdir(), 'teachmo-ts-ratchet-'));
mkdirSync(join(dir, 'src'));
writeFileSync(join(dir, 'src/a.js'), 'export const a = 1;\n');
writeFileSync(join(dir, 'src/b.ts'), 'const value: any = 1;\n// @ts-ignore\n');

const counts = computeCounts(['src/a.js', 'src/b.ts'], (file) => readFileSync(join(dir, file), 'utf8'));
assert.equal(counts.js, 1);
assert.equal(counts.ts, 1);
assert.equal(counts.any, 1);
assert.equal(counts.tsIgnore, 1);

const failures = compareCounts(
  { ...counts, js: 2, any: 2 },
  { counts, budgets: { allowJsIncrease: 0, allowAnyIncrease: 0 } }
);
assert.equal(failures.length, 2);

console.log('check-ts-ratchet tests passed');
