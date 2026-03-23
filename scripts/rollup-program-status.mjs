import process from 'process';
import { createGitHubClient, loadIssuePack, markerFor } from './issue-pack-core.mjs';

const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const writeComment = String(process.env.WRITE_COMMENT || 'false').toLowerCase() === 'true';

if (!repo || !token) {
  throw new Error('Missing GITHUB_REPOSITORY or GITHUB_TOKEN');
}

const [owner, repoName] = repo.split('/');
const issuePack = loadIssuePack();
const { gh } = createGitHubClient({ token });

async function listIssues() {
  const all = [];
  for (let page = 1; page <= 10; page += 1) {
    const items = await gh(`/repos/${owner}/${repoName}/issues?state=all&per_page=100&page=${page}`);
    all.push(...items.filter((i) => !i.pull_request));
    if (items.length < 100) break;
  }
  return all;
}

function findIssueByKey(issues, key) {
  const marker = markerFor(key);
  return issues.find((issue) => (issue.body || '').includes(marker));
}

function renderStatus(state) {
  return state === 'closed' ? 'Closed' : 'Open';
}

function renderRollupTable(rows) {
  return [
    '## Automation Rollup',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '| Workstream | Issue | Status |',
    '|---|---:|---|',
    ...rows.map((row) => `| ${row.title} | ${row.issueCell} | ${row.status} |`),
  ].join('\n');
}

function replaceRollupSection(body, rollup) {
  if (body.includes('## Automation Rollup')) {
    return body.replace(/## Automation Rollup[\s\S]*?(?=\n## Linked child issues|\s*$)/m, rollup);
  }
  return `${body}\n\n${rollup}`;
}

async function updateIssueBody(issueNumber, body) {
  await gh(`/repos/${owner}/${repoName}/issues/${issueNumber}`, {
    method: 'PATCH',
    body: JSON.stringify({ body }),
  });
}

async function postComment(issueNumber, body) {
  await gh(`/repos/${owner}/${repoName}/issues/${issueNumber}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
}

async function main() {
  const issues = await listIssues();
  const parentIssue = findIssueByKey(issues, issuePack.parent.key);

  if (!parentIssue) {
    throw new Error('Parent issue not found. Run bootstrap first.');
  }

  const rows = issuePack.children.map((child) => {
    const issue = findIssueByKey(issues, child.key);
    if (!issue) {
      return {
        title: child.title,
        issueCell: 'missing',
        status: 'Missing',
      };
    }

    return {
      title: child.title,
      issueCell: `#${issue.number}`,
      status: renderStatus(issue.state),
    };
  });

  const rollup = renderRollupTable(rows);
  const nextBody = replaceRollupSection(parentIssue.body || '', rollup);
  await updateIssueBody(parentIssue.number, nextBody);

  if (writeComment) {
    await postComment(parentIssue.number, `${rollup}\n\n_This rollup was generated automatically._`);
  }

  console.log(`Program rollup updated on parent issue #${parentIssue.number}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
