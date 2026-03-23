import process from 'process';
import { createGitHubClient, listAllIssues, loadIssuePack, markerFor } from './issue-pack-core.mjs';

const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const dryRun = String(process.env.DRY_RUN || 'false').toLowerCase() === 'true';
const writeComment = String(process.env.WRITE_COMMENT || 'false').toLowerCase() === 'true';

if (!repo || !token) {
  throw new Error('Missing GITHUB_REPOSITORY or GITHUB_TOKEN');
}

const [owner, repoName] = repo.split('/');
const issuePack = loadIssuePack();
const { gh } = createGitHubClient({ token });

async function listIssues() {
  const maxPages = Number.parseInt(process.env.ISSUE_PACK_MAX_PAGES || '20', 10);
  const normalizedMaxPages = Number.isFinite(maxPages) && maxPages > 0 ? maxPages : 20;
  return listAllIssues({ gh, owner, repoName, maxPages: normalizedMaxPages });
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

const ROLLUP_MARKER = '<!-- issue-pack-rollup -->';

async function upsertRollupComment(issueNumber, body) {
  const bodyWithMarker = `${ROLLUP_MARKER}\n${body}`;

  let page = 1;
  let found = null;

  while (page <= 10) {
    const comments = await gh(
      `/repos/${owner}/${repoName}/issues/${issueNumber}/comments?per_page=100&page=${page}`,
    );

    for (const comment of comments) {
      if ((comment.body || '').includes(ROLLUP_MARKER)) {
        found = comment;
      }
    }

    if (comments.length < 100) break;
    page += 1;
  }

  if (found) {
    await gh(`/repos/${owner}/${repoName}/issues/comments/${found.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ body: bodyWithMarker }),
    });
    return;
  }

  await gh(`/repos/${owner}/${repoName}/issues/${issueNumber}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body: bodyWithMarker }),
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

  if (dryRun) {
    console.log(`[dry-run] would update parent issue #${parentIssue.number} body`);
    if (writeComment) {
      console.log(`[dry-run] would upsert rollup comment on issue #${parentIssue.number}`);
    }
  } else {
    await updateIssueBody(parentIssue.number, nextBody);

    if (writeComment) {
      await upsertRollupComment(
        parentIssue.number,
        `${rollup}\n\n_This rollup was generated automatically._`,
      );
    }
  }

  console.log(
    dryRun
      ? 'Program rollup dry-run complete (no writes).'
      : `Program rollup updated on parent issue #${parentIssue.number}.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
