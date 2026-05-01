#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const result = spawnSync(process.execPath, ['scripts/check-production-auth-safety.mjs'], {
  stdio: 'inherit',
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log('Secret hygiene check passed.');
