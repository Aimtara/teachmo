import process from 'process';
import { fileURLToPath } from 'node:url';
import { createGitHubClient, loadIssuePack } from './issue-pack-core.mjs';
import { REQUIRED_STATUS_OPTIONS, REQUIRED_PRIORITY_OPTIONS } from './project-config.mjs';

export function fieldByName(project, name) {
  return project.fields.nodes.find((field) => field.name === name);
}

export function assertOptions(field, requiredOptions) {
  const actual = new Set((field?.options || []).map((option) => option.name));
  const missing = requiredOptions.filter((option) => !actual.has(option));

  if (missing.length > 0) {
    throw new Error(`Field "${field.name}" is missing options: ${missing.join(', ')}`);
  }
}

export async function validateProjectConfig({ graphql, projectOwner, projectNumber, projectFields = {} }) {
  const owner = projectOwner;
  const number = projectNumber == null || projectNumber === '' ? null : Number(projectNumber);

  if (!owner || !number) {
    throw new Error(
      'Missing project configuration. Set meta.project.owner + meta.project.number in ops/issue-pack.yml or pass PROJECT_OWNER / PROJECT_NUMBER.'
    );
  }

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

  const statusName = projectFields.status || 'Status';
  const priorityName = projectFields.priority || 'Priority';
  const workstreamName = projectFields.workstream || 'Workstream';

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

  assertOptions(statusField, REQUIRED_STATUS_OPTIONS);
  assertOptions(priorityField, REQUIRED_PRIORITY_OPTIONS);

  return project;
}

async function main() {
  const token = process.env.GITHUB_TOKEN || process.env.PROJECT_AUTOMATION_TOKEN;

  if (!token) {
    throw new Error('Missing PROJECT_AUTOMATION_TOKEN (or GITHUB_TOKEN)');
  }

  const issuePack = loadIssuePack();
  const { graphql } = createGitHubClient({ token });

  const projectOwner = process.env.PROJECT_OWNER || issuePack?.meta?.project?.owner;
  const projectNumber = process.env.PROJECT_NUMBER || issuePack?.meta?.project?.number;
  const projectFields = issuePack?.meta?.project?.fields || {};

  const project = await validateProjectConfig({ graphql, projectOwner, projectNumber, projectFields });

  console.log(`Project configuration validated for "${project.title}".`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
