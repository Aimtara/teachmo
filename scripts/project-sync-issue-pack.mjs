import process from 'process';
import { createGitHubClient, listAllIssues, loadIssuePack, markerFor } from './issue-pack-core.mjs';

const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const dryRun = String(process.env.DRY_RUN || 'false').toLowerCase() === 'true';

if (!repo || !token) {
  throw new Error('Missing GITHUB_REPOSITORY or GITHUB_TOKEN');
}

const [repoOwner, repoName] = repo.split('/');
const issuePack = loadIssuePack();
const { gh, graphql } = createGitHubClient({ token });

async function listIssues() {
  const maxPages = Number.parseInt(process.env.ISSUE_PACK_MAX_PAGES || '20', 10);
  const effectiveMaxPages = Number.isFinite(maxPages) && maxPages > 0 ? maxPages : 20;
  return listAllIssues({ gh, owner: repoOwner, repoName, maxPages: effectiveMaxPages });
}

function findIssueByKey(issues, key) {
  const marker = markerFor(key);
  return issues.find((issue) => (issue.body || '').includes(marker));
}

function getProjectConfig() {
  const owner = process.env.PROJECT_OWNER || issuePack?.meta?.project?.owner;
  const numberRaw = process.env.PROJECT_NUMBER || issuePack?.meta?.project?.number;
  const number = numberRaw == null || numberRaw === '' ? null : Number(numberRaw);

  if (!owner || !number) {
    throw new Error(
      'Missing project configuration. Set meta.project.owner + meta.project.number in ops/issue-pack.yml or pass PROJECT_OWNER / PROJECT_NUMBER.'
    );
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
          title
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
          title
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


function assertProjectFields({ statusField, priorityField, workstreamField, statusFieldName, priorityFieldName, workstreamFieldName }) {
  if (!statusField) throw new Error(`Project field not found: ${statusFieldName}`);
  if (!priorityField) throw new Error(`Project field not found: ${priorityFieldName}`);
  if (!workstreamField) throw new Error(`Project field not found: ${workstreamFieldName}`);

  if (!statusField.options) {
    throw new Error(`Project field "${statusFieldName}" must be a single-select field`);
  }

  if (!priorityField.options) {
    throw new Error(`Project field "${priorityFieldName}" must be a single-select field`);
  }

  const requiredStatusOptions = ['Todo', 'In Progress', 'Blocked', 'Done'];
  const statusOptions = new Set((statusField.options || []).map((option) => option.name));
  const missingStatus = requiredStatusOptions.filter((option) => !statusOptions.has(option));
  if (missingStatus.length > 0) {
    throw new Error(`Project field "${statusFieldName}" is missing options: ${missingStatus.join(', ')}`);
  }

  const requiredPriorityOptions = ['P0', 'P1', 'P2'];
  const priorityOptions = new Set((priorityField.options || []).map((option) => option.name));
  const missingPriority = requiredPriorityOptions.filter((option) => !priorityOptions.has(option));
  if (missingPriority.length > 0) {
    throw new Error(`Project field "${priorityFieldName}" is missing options: ${missingPriority.join(', ')}`);
  }
}

function getSingleSelectOptionId(field, optionName) {
  return field?.options?.find((o) => o.name === optionName)?.id || null;
}

async function addIssueToProject(projectId, contentId) {
  const mutation = `
    mutation AddProjectItem($projectId: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
        item {
          id
        }
      }
    }
  `;

  const data = await graphql(mutation, { projectId, contentId });
  return data.addProjectV2ItemById.item.id;
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

async function setTextField(projectId, itemId, fieldId, text) {
  const mutation = `
    mutation SetTextField($projectId: ID!, $itemId: ID!, $fieldId: ID!, $text: String!) {
      updateProjectV2ItemFieldValue(
        input: {
          projectId: $projectId
          itemId: $itemId
          fieldId: $fieldId
          value: { text: $text }
        }
      ) {
        projectV2Item {
          id
        }
      }
    }
  `;

  await graphql(mutation, { projectId, itemId, fieldId, text });
}

async function main() {
  const issues = await listIssues();
  const project = await getProject();
  const projectItems = await listProjectItems(project.id);

  const projectFields = issuePack?.meta?.project?.fields || {};
  const statusFieldName = projectFields.status || 'Status';
  const priorityFieldName = projectFields.priority || 'Priority';
  const workstreamFieldName = projectFields.workstream || 'Workstream';

  const statusField = getFieldByName(project, statusFieldName);
  const priorityField = getFieldByName(project, priorityFieldName);
  const workstreamField = getFieldByName(project, workstreamFieldName);

  assertProjectFields({
    statusField,
    priorityField,
    workstreamField,
    statusFieldName,
    priorityFieldName,
    workstreamFieldName,
  });

  for (const child of issuePack.children) {
    const issue = findIssueByKey(issues, child.key);

    if (!issue) {
      console.warn(`Issue not found for key=${child.key}. Run bootstrap first.`);
      continue;
    }

    let item = projectItems.find((node) => node.content?.number === issue.number);

    if (!item) {
      if (dryRun) {
        console.log(`[dry-run] add issue #${issue.number} to project`);
      } else {
        const itemId = await addIssueToProject(project.id, issue.node_id);
        item = { id: itemId };
        projectItems.push({ id: itemId, content: { number: issue.number } });
        console.log(`Added #${issue.number} to project`);
      }
    }

    if (!item) continue;

    const fields = child.project_fields || {};

    if (dryRun) {
      console.log(`[dry-run] set project fields for #${issue.number}`, fields);
      continue;
    }

    if (fields.status && statusField?.options) {
      const optionId = getSingleSelectOptionId(statusField, fields.status);
      if (optionId) {
        await setSingleSelectField(project.id, item.id, statusField.id, optionId);
      } else {
        console.warn(`Status option not found: ${fields.status}`);
      }
    }

    if (fields.priority && priorityField?.options) {
      const optionId = getSingleSelectOptionId(priorityField, fields.priority);
      if (optionId) {
        await setSingleSelectField(project.id, item.id, priorityField.id, optionId);
      } else {
        console.warn(`Priority option not found: ${fields.priority}`);
      }
    }

    if (fields.workstream && workstreamField) {
      if (workstreamField.options) {
        const optionId = getSingleSelectOptionId(workstreamField, fields.workstream);
        if (optionId) {
          await setSingleSelectField(project.id, item.id, workstreamField.id, optionId);
        } else {
          console.warn(`Workstream option not found: ${fields.workstream}`);
        }
      } else {
        await setTextField(project.id, item.id, workstreamField.id, fields.workstream);
      }
    }

    console.log(`Synced project fields for #${issue.number}`);
  }

  console.log('Project sync complete.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
