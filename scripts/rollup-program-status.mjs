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
  let page = 1;
  // Paginate until GitHub returns fewer than 100 items, indicating the last page.
  // This avoids the previous hard cap of 10 pages (1000 issues).
  while (true) {
    const items = await gh(`/repos/${owner}/${repoName}/issues?state=all&per_page=100&page=${page}`);
    all.push(...items.filter((i) => !i.pull_request));
    if (items.length < 100) {
      break;
    }
    page += 1;
  }
  return all;
}

function findIssueByKey(issues, key) {
  const marker = markerFor(key);
  return issues.find((issue) => (issue.body || '').includes(marker));
}

function priorityFor(issue) {
  const labels = (issue.labels || []).map((l) => (typeof l === 'string' ? l : l.name));
  return labels.find((name) => /^P[0-3]$/i.test(name)) || 'unlabeled';
}

function formatRollup({ parent, children }) {
  const openChildren = children.filter((c) => c.issue && c.issue.state === 'open').length;
  const closedChildren = children.filter((c) => c.issue && c.issue.state === 'closed').length;
  const missingChildren = children.filter((c) => !c.issue).length;

  const byPriority = new Map();
  for (const child of children) {
    if (!child.issue) continue;
    const p = priorityFor(child.issue);
    const stats = byPriority.get(p) || { open: 0, closed: 0 };
    stats[child.issue.state] += 1;
    byPriority.set(p, stats);
  }

  const lines = [
    '## Program Status Rollup',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    `- Parent issue: ${parent ? `#${parent.number}` : 'missing'}`,
    `- Child issues: ${children.length}`,
    `- Open child issues: ${openChildren}`,
    `- Closed child issues: ${closedChildren}`,
    `- Missing child issues: ${missingChildren}`,
    '',
    '### Child issue detail',
  ];

  for (const child of children) {
    if (!child.issue) {
      lines.push(`- ❌ ${child.key} — ${child.title} (missing)`);
      continue;
    }
    const check = child.issue.state === 'open' ? '⬜' : '✅';
    lines.push(`- ${check} #${child.issue.number} — ${child.title} (${child.issue.state})`);
  }

  lines.push('', '### Priority breakdown');
  for (const [priority, stats] of [...byPriority.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`- ${priority}: ${stats.open} open / ${stats.closed} closed`);
  }

  return lines.join('\n');
}

const ROLLUP_MARKER = '<!-- issue-pack-rollup -->';
const MAX_COMMENT_PAGES = 10;

async function upsertRollupComment(issueNumber, body) {
  const bodyWithMarker = `${ROLLUP_MARKER}\n${body}`;

  let page = 1;
  let mostRecent = null;

  while (page <= MAX_COMMENT_PAGES) {
    const comments = await gh(
      `/repos/${owner}/${repoName}/issues/${issueNumber}/comments?per_page=100&page=${page}`,
    );

    for (const comment of comments) {
      if ((comment.body || '').includes(ROLLUP_MARKER)) {
        if (!mostRecent || comment.id > mostRecent.id) {
          mostRecent = comment;
        }
      }
    }

    if (comments.length < 100) {
      break;
    }

    page += 1;
  }

  if (mostRecent) {
    await gh(`/repos/${owner}/${repoName}/issues/comments/${mostRecent.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ body: bodyWithMarker }),
    });
    console.log(`Updated rollup comment ${mostRecent.id} on parent issue #${issueNumber}`);
    return;
  }
  await gh(`/repos/${owner}/${repoName}/issues/${issueNumber}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body: bodyWithMarker }),
  });
  console.log(`Posted rollup comment to parent issue #${issueNumber}`);
}

async function main() {
  const issues = await listIssues();
  const parentIssue = findIssueByKey(issues, issuePack.parent.key);

  const children = issuePack.children.map((child) => ({
    key: child.key,
    title: child.title,
    issue: findIssueByKey(issues, child.key),
  }));

  const rollupBody = formatRollup({ parent: parentIssue, children });
  console.log(rollupBody);

  if (!writeComment) {
    return;
  }

  if (!parentIssue) {
    throw new Error('Cannot write rollup comment: parent issue not found');
  }

  await upsertRollupComment(parentIssue.number, rollupBody);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
