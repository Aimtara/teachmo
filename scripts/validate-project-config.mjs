import process from 'process';
import { createGitHubClient, loadIssuePack } from './issue-pack-core.mjs';

const token = process.env.GITHUB_TOKEN || process.env.PROJECT_AUTOMATION_TOKEN;

if (!token) {
  throw new Error('Missing PROJECT_AUTOMATION_TOKEN (or GITHUB_TOKEN)');
}

const issuePack = loadIssuePack();
const { graphql } = createGitHubClient({ token });

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
          fields(first: 100) {
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
          fields(first: 100) {
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

function fieldByName(project, name) {
  return project.fields.nodes.find((field) => field.name === name);
}

function assertOptions(field, requiredOptions) {
  const actual = new Set((field?.options || []).map((option) => option.name));
  const missing = requiredOptions.filter((option) => !actual.has(option));

  if (missing.length > 0) {
    throw new Error(`Field "${field.name}" is missing options: ${missing.join(', ')}`);
  }
}

async function main() {
  const projectFields = issuePack?.meta?.project?.fields || {};
  const statusName = projectFields.status || 'Status';
  const priorityName = projectFields.priority || 'Priority';
  const workstreamName = projectFields.workstream || 'Workstream';

  const project = await getProject();

  const statusField = fieldByName(project, statusName);
  const priorityField = fieldByName(project, priorityName);
  const workstreamField = fieldByName(project, workstreamName);

  if (!statusField) throw new Error(`Missing project field: ${statusName}`);
  if (!priorityField) throw new Error(`Missing project field: ${priorityName}`);
  if (!workstreamField) throw new Error(`Missing project field: ${workstreamName}`);

  if (!statusField.options) {
    throw new Error(`Project field "${statusName}" must be a single-select field`);
  }

  if (!priorityField.options) {
    throw new Error(`Project field "${priorityName}" must be a single-select field`);
  }

  assertOptions(statusField, ['Todo', 'In Progress', 'Blocked', 'Done']);
  assertOptions(priorityField, ['P0', 'P1', 'P2']);

  console.log(`Project configuration validated for "${project.title}".`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
