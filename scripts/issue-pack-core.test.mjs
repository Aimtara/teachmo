import test from 'node:test';
import assert from 'node:assert/strict';
import { listAllIssues } from './issue-pack-core.mjs';

test('listAllIssues paginates and filters pull requests', async () => {
  const firstPage = Array.from({ length: 99 }, (_, i) => ({ id: i + 1, number: i + 1 }));
  firstPage.push({ id: 999, number: 999, pull_request: { url: 'x' } });
  const pages = [
    firstPage,
    [{ id: 3, number: 3 }],
  ];

  const called = [];
  const gh = async (path) => {
    called.push(path);
    const page = Number(new URL(`https://x.test${path}`).searchParams.get('page'));
    return pages[page - 1] || [];
  };

  const issues = await listAllIssues({ gh, owner: 'o', repoName: 'r', maxPages: 10 });

  assert.equal(issues.length, 100);
  assert.equal(issues[0].number, 1);
  assert.equal(issues[issues.length - 1].number, 3);
  assert.equal(called.length, 2);
});

test('listAllIssues respects maxPages', async () => {
  const gh = async () => Array.from({ length: 100 }, (_, i) => ({ id: i + 1, number: i + 1 }));
  const issues = await listAllIssues({ gh, owner: 'o', repoName: 'r', maxPages: 2 });

  assert.equal(issues.length, 200);
});
