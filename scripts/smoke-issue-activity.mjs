import process from 'node:process';
import { createGitHubClient } from './issue-pack-core.mjs';

const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN || process.env.PROJECT_AUTOMATION_TOKEN;
const issueNumber = Number(process.env.ISSUE_NUMBER);
const dryRun = String(process.env.DRY_RUN || 'false').toLowerCase() === 'true';

if (!repository) {
  throw new Error('Missing GITHUB_REPOSITORY (expected owner/repo)');
}

if (!token) {
  throw new Error('Missing PROJECT_AUTOMATION_TOKEN (or GITHUB_TOKEN)');
}

if (!Number.isInteger(issueNumber) || issueNumber <= 0) {
  throw new Error('Missing ISSUE_NUMBER (must be a positive integer)');
}

const [owner, repo] = repository.split('/');
const { gh } = createGitHubClient({ token });

async function getIssue() {
  return gh(`/repos/${owner}/${repo}/issues/${issueNumber}`);
}

function normalizeLabels(labels = []) {
  return labels.map((label) => (typeof label === 'string' ? label : label.name)).filter(Boolean);
}

async function updateIssue(payload) {
  return gh(`/repos/${owner}/${repo}/issues/${issueNumber}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

async function setLabels(labels) {
  return gh(`/repos/${owner}/${repo}/issues/${issueNumber}`, {
    method: 'PATCH',
    body: JSON.stringify({ labels }),
  });
}

async function ensureLabel(label) {
  if (dryRun) {
    console.log(`[dry-run] add label: ${label}`);
    return;
  }

  const issue = await getIssue();
  const labels = normalizeLabels(issue.labels);

  if (labels.includes(label)) {
    console.log(`Label already present: ${label}`);
    return;
  }

  const nextLabels = [...new Set([...labels, label])];
  await setLabels(nextLabels);
  console.log(`Added label: ${label}`);
}

async function ensureState(state) {
  if (dryRun) {
    console.log(`[dry-run] set issue #${issueNumber} state to ${state}`);
    return;
  }

  const issue = await getIssue();

  if (issue.state === state) {
    console.log(`Issue already ${state}: #${issue.number}`);
    return;
  }

  await updateIssue({ state });
  console.log(`Set issue #${issue.number} state to ${state}`);
}

async function main() {
  console.log(`Running issue activity smoke test for #${issueNumber} in ${repository}${dryRun ? ' (dry-run)' : ''}`);
  await ensureLabel('in-progress');
  await ensureLabel('blocked');
  await ensureState('closed');
  await ensureState('open');
  console.log('Issue activity smoke test complete.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
