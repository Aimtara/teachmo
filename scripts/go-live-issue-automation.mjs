import { spawnSync } from 'node:child_process';
import process from 'node:process';

const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.PROJECT_AUTOMATION_TOKEN || process.env.GITHUB_TOKEN;
const dryRun = String(process.env.DRY_RUN || 'true').toLowerCase();

if (!repository) {
  throw new Error('Missing GITHUB_REPOSITORY (expected owner/repo)');
}

if (!token) {
  throw new Error('Missing PROJECT_AUTOMATION_TOKEN (or GITHUB_TOKEN)');
}

const env = {
  ...process.env,
  GITHUB_TOKEN: token,
  DRY_RUN: dryRun,
};

const steps = [
  ['issues:validate', ['node', 'scripts/validate-issue-pack.mjs']],
  ['issues:bootstrap', ['node', 'scripts/bootstrap-issue-pack.mjs']],
  ['issues:project-sync', ['node', 'scripts/project-sync-issue-pack.mjs']],
  ['issues:rollup', ['node', 'scripts/rollup-program-status.mjs']],
];

for (const [name, command] of steps) {
  console.log(`\n==> Running ${name} (DRY_RUN=${dryRun})`);
  const [cmd, ...args] = command;
  const result = spawnSync(cmd, args, { env, stdio: 'inherit' });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('\nGo-live sequence completed.');
