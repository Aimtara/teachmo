import process from 'process';
import { createGitHubClient, loadIssuePack } from './issue-pack-core.mjs';

const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const issueNumber = Number(process.env.ISSUE_NUMBER);
const issueAction = process.env.ISSUE_ACTION;

if (!repo || !token || !issueNumber) {
  throw new Error('Missing GITHUB_REPOSITORY, GITHUB_TOKEN, or ISSUE_NUMBER');
}

const [repoOwner, repoName] = repo.split('/');
const issuePack = loadIssuePack();
const { gh, graphql } = createGitHubClient({ token });

async function getIssue() {
  return gh(`/repos/${repoOwner}/${repoName}/issues/${issueNumber}`);
}

function issueBelongsToPack(issue) {
  return (issue.body || '').includes('<!-- issue-pack-key:');
}

function computeStatus(issue) {
  const labels = (issue.labels || []).map((l) => (typeof l === 'string' ? l : l.name));

  if (issue.state === 'closed') return 'Done';
  if (labels.includes('blocked')) return 'Blocked';
  if (labels.includes('in-progress')) return 'In Progress';
  return 'Todo';
}

function getProjectConfig() {
  const owner = issuePack?.meta?.project?.owner;
  const numberRaw = issuePack?.meta?.project?.number;
  const number = numberRaw == null || numberRaw === '' ? null : Number(numberRaw);

  if (!owner || !number) {
    throw new Error('Missing meta.project.owner or meta.project.number in ops/issue-pack.yml');
  }

  return { owner, number };
}

async function getProject() {
  const { owner, number } = getProjectConfig();

  const query = `
    query GetProject($owner: String!, $number: Int!) {
      organization(login: $owner) {
        projectV2(number: $number) {
          id
          fields(first: 50) {
            nodes {
              ... on ProjectV2Field {
                id
                name
              }
              ... on ProjectV2SingleSelectField {
                id
                name
                options {
                  id
                  name
                }
              }
            }
          }
        }
      }
      user(login: $owner) {
        projectV2(number: $number) {
          id
          fields(first: 50) {
            nodes {
              ... on ProjectV2Field {
                id
                name
              }
              ... on ProjectV2SingleSelectField {
                id
                name
                options {
                  id
                  name
                }
              }
            }
          }
        }
      }
    }
  `;

  const data = await graphql(query, { owner, number });
  const project = data.organization?.projectV2 || data.user?.projectV2;

  if (!project) {
    throw new Error(`Project not found: ${owner} #${number}`);
  }

  return project;
}

async function listProjectItems(projectId) {
  const query = `
    query ListProjectItems($projectId: ID!, $cursor: String) {
      node(id: $projectId) {
        ... on ProjectV2 {
          items(first: 100, after: $cursor) {
            nodes {
              id
              content {
                ... on Issue {
                  id
                  number
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      }
    }
  `;

  const all = [];
  let cursor = null;

  while (true) {
    const data = await graphql(query, { projectId, cursor });
    const connection = data?.node?.items;
    all.push(...(connection?.nodes || []));

    if (!connection?.pageInfo?.hasNextPage) {
      break;
    }
    cursor = connection.pageInfo.endCursor;
  }

  return all;
}

function getFieldByName(project, fieldName) {
  return project.fields.nodes.find((f) => f.name === fieldName);
}

function getSingleSelectOptionId(field, optionName) {
  return field?.options?.find((o) => o.name === optionName)?.id || null;
}

async function setSingleSelectField(projectId, itemId, fieldId, optionId) {
  const mutation = `
    mutation SetFieldValue($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
      updateProjectV2ItemFieldValue(
        input: {
          projectId: $projectId
          itemId: $itemId
          fieldId: $fieldId
          value: { singleSelectOptionId: $optionId }
        }
      ) {
        projectV2Item {
          id
        }
      }
    }
  `;

  await graphql(mutation, { projectId, itemId, fieldId, optionId });
}

async function main() {
  const issue = await getIssue();

  if (!issueBelongsToPack(issue)) {
    console.log(`Issue #${issue.number} is not managed by issue-pack. Skipping.`);
    return;
  }

  const project = await getProject();
  const projectItems = await listProjectItems(project.id);
  const statusFieldName = issuePack?.meta?.project?.fields?.status || 'Status';
  const statusField = getFieldByName(project, statusFieldName);

  if (!statusField) {
    throw new Error(`Project status field "${statusFieldName}" not found`);
  }

  const item = projectItems.find((node) => node.content?.number === issue.number);

  if (!item) {
    console.log(`Issue #${issue.number} is not on the project board. Run project sync first.`);
    return;
  }

  const nextStatus = computeStatus(issue);
  const optionId = getSingleSelectOptionId(statusField, nextStatus);

  if (!optionId) {
    throw new Error(`Project status option "${nextStatus}" not found`);
  }

  await setSingleSelectField(project.id, item.id, statusField.id, optionId);

  console.log(
    `Updated project status for issue #${issue.number} to "${nextStatus}" (action=${issueAction})`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
