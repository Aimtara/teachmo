import fs from 'node:fs';
import { parse } from 'yaml';

function boolEnv(name, fallback) {
  const raw = process.env[name];
  if (raw == null || raw === '') return fallback;
  return String(raw).toLowerCase() === 'true';
}

export function markerFor(key) {
  return `<!-- issue-pack-key: ${key} -->`;
}

export function loadIssuePack(path = 'ops/issue-pack.yml') {
  const raw = fs.readFileSync(path, 'utf8');
  const parsed = parse(raw);
  if (!parsed?.parent || !Array.isArray(parsed?.children)) {
    throw new Error('Invalid issue pack: expected parent and children');
  }
  return parsed;
}

export function createGitHubClient({ token }) {
  if (!token) {
    throw new Error('Missing GITHUB_TOKEN');
  }

  async function gh(path, options = {}) {
    const response = await fetch(`https://api.github.com${path}`, {
      ...options,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`GitHub API ${response.status} ${path}: ${text}`);
    }

    return response.status === 204 ? null : response.json();
  }

  async function graphql(query, variables = {}) {
    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`GitHub GraphQL ${response.status}: ${text}`);
    }

    const payload = await response.json();
    if (payload.errors?.length) {
      throw new Error(`GitHub GraphQL errors: ${JSON.stringify(payload.errors)}`);
    }

    return payload.data;
  }

  return { gh, graphql };
}

function findIssueByKey(issues, key) {
  const marker = markerFor(key);
  return issues.find((issue) => (issue.body || '').includes(marker));
}

const LINKS_START = '<!-- issue-pack-links:start -->';
const LINKS_END = '<!-- issue-pack-links:end -->';

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildParentBodyWithLinks(parentBody, childIssues) {
  const linksBlock = [
    LINKS_START,
    '## Linked child issues',
    '',
    ...childIssues.map((child) => `- [ ] #${child.number} — ${child.title}`),
    LINKS_END,
  ].join('\n');

  const markerPattern = new RegExp(`${escapeRegex(LINKS_START)}[\\s\\S]*?${escapeRegex(LINKS_END)}`);
  if (markerPattern.test(parentBody)) {
    return parentBody.replace(markerPattern, linksBlock);
  }

  return `${parentBody}\n\n${linksBlock}`;
}

function normalizeAssignees(assignees = [], assigneeMap = {}) {
  return assignees.map((name) => assigneeMap[name] || name).filter(Boolean);
}

export async function runIssuePack({ mode = 'bootstrap' } = {}) {
  const repository = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  const dryRun = boolEnv('DRY_RUN', mode === 'bootstrap');
  const updateExisting = boolEnv('UPDATE_EXISTING', true);
  const createMissing = boolEnv('CREATE_MISSING', true);

  if (!repository) throw new Error('Missing GITHUB_REPOSITORY');
  const [owner, repoName] = repository.split('/');
  if (!owner || !repoName) throw new Error(`Invalid GITHUB_REPOSITORY: ${repository}`);

  const issuePack = loadIssuePack();
  const { gh, graphql } = createGitHubClient({ token });

  async function listIssues() {
    const all = [];
    const perPage = 100;
    const maxPagesEnv = process.env.ISSUE_PACK_MAX_PAGES;
    const parsedMaxPages = maxPagesEnv ? Number.parseInt(maxPagesEnv, 10) : Number.NaN;
    const effectiveMaxPages = Number.isFinite(parsedMaxPages) && parsedMaxPages > 0 ? parsedMaxPages : 10;
    let page = 1;

    while (page <= effectiveMaxPages) {
      const items = await gh(
        `/repos/${owner}/${repoName}/issues?state=all&per_page=${perPage}&page=${page}`,
      );
      const issuesOnly = items.filter((i) => !i.pull_request);
      all.push(...issuesOnly);
      if (items.length < perPage) {
        break;
      }
      page += 1;
    }

    if (page > effectiveMaxPages && all.length && process.env.ISSUE_PACK_MAX_PAGES == null) {
      console.warn(
        `[issue-pack] Reached default page limit (${effectiveMaxPages}) when listing issues;` +
          ' set ISSUE_PACK_MAX_PAGES to a higher value if you need to scan more issues.',
      );
    }
    return all;
  }

  async function listComments(issueNumber) {
    const all = [];
    for (let page = 1; page <= 10; page += 1) {
      const items = await gh(
        `/repos/${owner}/${repoName}/issues/${issueNumber}/comments?per_page=100&page=${page}`,
      );
      all.push(...items);
      if (items.length < 100) break;
    }
    return all;
  }

  async function ensureLabel(name) {
    if (dryRun) {
      console.log(`[dry-run] ensure label: ${name}`);
      return;
    }

    try {
      await gh(`/repos/${owner}/${repoName}/labels/${encodeURIComponent(name)}`);
    } catch {
      await gh(`/repos/${owner}/${repoName}/labels`, {
        method: 'POST',
        body: JSON.stringify({ name, color: '0e8a16' }),
      });
    }
  }

  async function ensureMilestone(title) {
    if (!title) return null;
    if (dryRun) {
      console.log(`[dry-run] ensure milestone: ${title}`);
      return null;
    }

    const milestones = await gh(`/repos/${owner}/${repoName}/milestones?state=all&per_page=100`);
    const existing = milestones.find((m) => m.title === title);
    if (existing) return existing.number;

    const created = await gh(`/repos/${owner}/${repoName}/milestones`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
    return created.number;
  }

  async function createIssue(payload) {
    if (dryRun) {
      console.log(`[dry-run] create issue: ${payload.title}`);
      return { number: 0, node_id: 'dry-run', html_url: '(dry-run)' };
    }

    return gh(`/repos/${owner}/${repoName}/issues`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async function updateIssue(issueNumber, payload) {
    if (dryRun) {
      console.log(`[dry-run] update issue #${issueNumber}: ${payload.title}`);
      return;
    }

    await gh(`/repos/${owner}/${repoName}/issues/${issueNumber}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async function ensureComments(issueNumber, comments = []) {
    if (!Array.isArray(comments) || comments.length === 0) return;

    if (dryRun) {
      for (const comment of comments) {
        console.log(`[dry-run] add comment to #${issueNumber}: ${comment.slice(0, 60)}...`);
      }
      return;
    }

    const existing = await listComments(issueNumber);
    const existingBodies = new Set(existing.map((c) => c.body || ''));

    for (const body of comments) {
      if (existingBodies.has(body)) continue;
      await gh(`/repos/${owner}/${repoName}/issues/${issueNumber}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      });
    }
  }

  async function resolveProjectId(ownerLogin, projectNumber) {
    if (!ownerLogin || !projectNumber) return null;

    const queryOrg = `
      query($login: String!, $number: Int!) {
        organization(login: $login) {
          projectV2(number: $number) { id }
        }
      }
    `;

    const queryUser = `
      query($login: String!, $number: Int!) {
        user(login: $login) {
          projectV2(number: $number) { id }
        }
      }
    `;

    try {
      const orgData = await graphql(queryOrg, { login: ownerLogin, number: Number(projectNumber) });
      if (orgData?.organization?.projectV2?.id) return orgData.organization.projectV2.id;
    } catch {
      // Fall through to user lookup.
    }

    try {
      const userData = await graphql(queryUser, { login: ownerLogin, number: Number(projectNumber) });
      return userData?.user?.projectV2?.id || null;
    } catch {
      return null;
    }
  }

  async function addIssueToProject(projectId, issueNodeId) {
    if (!projectId || !issueNodeId) return;
    if (dryRun) {
      console.log(`[dry-run] add issue node ${issueNodeId} to project ${projectId}`);
      return;
    }

    const mutation = `
      mutation($projectId: ID!, $contentId: ID!) {
        addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
          item { id }
        }
      }
    `;

    try {
      await graphql(mutation, { projectId, contentId: issueNodeId });
    } catch (error) {
      console.warn(`Project add failed for content ${issueNodeId}: ${error.message}`);
    }
  }

  const issues = await listIssues();
  const assigneeMap = issuePack?.meta?.assignee_map || {};

  const projectOwner = process.env.PROJECT_OWNER || issuePack?.meta?.project?.owner;
  const projectNumber = process.env.PROJECT_NUMBER || issuePack?.meta?.project?.number;
  const projectId = await resolveProjectId(projectOwner, projectNumber);

  const allLabels = new Set([
    ...(issuePack.parent.labels || []),
    ...issuePack.children.flatMap((child) => child.labels || []),
  ]);
  for (const label of allLabels) await ensureLabel(label);

  const parentMilestone = await ensureMilestone(issuePack.parent.milestone);
  const existingParent = findIssueByKey(issues, issuePack.parent.key);
  let parentIssue = existingParent;

  if (!parentIssue && createMissing) {
    parentIssue = await createIssue({
      title: issuePack.parent.title,
      body: issuePack.parent.body,
      labels: issuePack.parent.labels || [],
      assignees: normalizeAssignees(issuePack.parent.assignees || [], assigneeMap),
      milestone: parentMilestone || undefined,
    });
  } else if (parentIssue && updateExisting) {
    await updateIssue(parentIssue.number, {
      title: issuePack.parent.title,
      body: issuePack.parent.body,
      labels: issuePack.parent.labels || [],
      assignees: normalizeAssignees(issuePack.parent.assignees || [], assigneeMap),
      milestone: parentMilestone || undefined,
    });
  }

  const createdOrFoundChildren = [];

  for (const child of issuePack.children) {
    const milestoneNumber = await ensureMilestone(child.milestone);
    let childIssue = findIssueByKey(issues, child.key);

    const payload = {
      title: child.title,
      body: child.body,
      labels: child.labels || [],
      assignees: normalizeAssignees(child.assignees || [], assigneeMap),
      milestone: milestoneNumber || undefined,
    };

    if (!childIssue && createMissing) {
      childIssue = await createIssue(payload);
    } else if (childIssue && updateExisting) {
      await updateIssue(childIssue.number, payload);
    }

    if (!childIssue) {
      continue;
    }

    await ensureComments(childIssue.number, child.comments || []);
    await addIssueToProject(projectId, childIssue.node_id);

    createdOrFoundChildren.push({
      number: childIssue.number,
      title: child.title,
      url: childIssue.html_url,
      nodeId: childIssue.node_id,
    });
  }

  const parentWasCreated = !existingParent;
  if (parentIssue && !dryRun && (parentWasCreated || updateExisting)) {
    const nextParentBody = buildParentBodyWithLinks(issuePack.parent.body, createdOrFoundChildren);
    await updateIssue(parentIssue.number, {
      title: issuePack.parent.title,
      body: nextParentBody,
      labels: issuePack.parent.labels || [],
      assignees: normalizeAssignees(issuePack.parent.assignees || [], assigneeMap),
      milestone: parentMilestone || undefined,
    });
    await ensureComments(parentIssue.number, issuePack.parent.comments || []);
    await addIssueToProject(projectId, parentIssue.node_id);
  }

  console.log(`Issue pack ${mode} complete.`);
  console.log(`Parent issue: #${parentIssue?.number ?? '(none)'}`);
  console.log(`Children processed: ${createdOrFoundChildren.length}`);
}

export { boolEnv };
