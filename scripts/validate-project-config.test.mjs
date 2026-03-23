import test from 'node:test';
import assert from 'node:assert/strict';
import { fieldByName, assertOptions, validateProjectConfig } from './validate-project-config.mjs';
import { REQUIRED_STATUS_OPTIONS, REQUIRED_PRIORITY_OPTIONS } from './project-config.mjs';

// --- fieldByName ---

test('fieldByName returns matching field', () => {
  const project = {
    fields: {
      nodes: [
        { id: '1', name: 'Status', options: [] },
        { id: '2', name: 'Priority', options: [] },
      ],
    },
  };
  const field = fieldByName(project, 'Status');
  assert.equal(field.id, '1');
});

test('fieldByName returns undefined when field is missing', () => {
  const project = { fields: { nodes: [{ id: '1', name: 'Status', options: [] }] } };
  assert.equal(fieldByName(project, 'Workstream'), undefined);
});

test('fieldByName returns undefined when nodes list is empty', () => {
  const project = { fields: { nodes: [] } };
  assert.equal(fieldByName(project, 'Status'), undefined);
});

// --- assertOptions ---

test('assertOptions passes when all required options are present', () => {
  const field = {
    name: 'Status',
    options: [
      { name: 'Todo' },
      { name: 'In Progress' },
      { name: 'Blocked' },
      { name: 'Done' },
      { name: 'Extra' },
    ],
  };
  assert.doesNotThrow(() => assertOptions(field, REQUIRED_STATUS_OPTIONS));
});

test('assertOptions throws when options are missing', () => {
  const field = {
    name: 'Status',
    options: [{ name: 'Todo' }, { name: 'Done' }],
  };
  assert.throws(
    () => assertOptions(field, REQUIRED_STATUS_OPTIONS),
    /Field "Status" is missing options: In Progress, Blocked/
  );
});

test('assertOptions throws with all missing options listed', () => {
  const field = { name: 'Priority', options: [] };
  assert.throws(
    () => assertOptions(field, REQUIRED_PRIORITY_OPTIONS),
    /Field "Priority" is missing options: P0, P1, P2/
  );
});

test('assertOptions handles null/undefined field options gracefully', () => {
  const field = { name: 'Status' }; // no options property
  assert.throws(
    () => assertOptions(field, REQUIRED_STATUS_OPTIONS),
    /Field "Status" is missing options/
  );
});

// --- validateProjectConfig ---

function makeGraphql(project) {
  return async () => ({
    organization: { projectV2: project },
    user: null,
  });
}

function makeProject(overrides = {}) {
  return {
    id: 'PVT_1',
    title: 'Test Project',
    fields: {
      nodes: [
        {
          id: 'f1',
          name: 'Status',
          options: [
            { id: 'o1', name: 'Todo' },
            { id: 'o2', name: 'In Progress' },
            { id: 'o3', name: 'Blocked' },
            { id: 'o4', name: 'Done' },
          ],
        },
        {
          id: 'f2',
          name: 'Priority',
          options: [
            { id: 'o5', name: 'P0' },
            { id: 'o6', name: 'P1' },
            { id: 'o7', name: 'P2' },
          ],
        },
        { id: 'f3', name: 'Workstream', options: [] },
      ],
    },
    ...overrides,
  };
}

test('validateProjectConfig succeeds with valid project', async () => {
  const project = makeProject();
  const graphql = makeGraphql(project);
  const result = await validateProjectConfig({
    graphql,
    projectOwner: 'my-org',
    projectNumber: 1,
  });
  assert.equal(result.title, 'Test Project');
});

test('validateProjectConfig throws when owner is missing', async () => {
  const graphql = makeGraphql(makeProject());
  await assert.rejects(
    () => validateProjectConfig({ graphql, projectOwner: '', projectNumber: 1 }),
    /Missing project configuration/
  );
});

test('validateProjectConfig throws when number is missing', async () => {
  const graphql = makeGraphql(makeProject());
  await assert.rejects(
    () => validateProjectConfig({ graphql, projectOwner: 'my-org', projectNumber: '' }),
    /Missing project configuration/
  );
});

test('validateProjectConfig throws when project is not found', async () => {
  const graphql = async () => ({ organization: null, user: null });
  await assert.rejects(
    () => validateProjectConfig({ graphql, projectOwner: 'my-org', projectNumber: 99 }),
    /Project not found: my-org #99/
  );
});

test('validateProjectConfig throws when Status field is missing', async () => {
  const project = makeProject({
    fields: {
      nodes: [
        { id: 'f2', name: 'Priority', options: [{ id: 'o5', name: 'P0' }, { id: 'o6', name: 'P1' }, { id: 'o7', name: 'P2' }] },
        { id: 'f3', name: 'Workstream', options: [] },
      ],
    },
  });
  const graphql = makeGraphql(project);
  await assert.rejects(
    () => validateProjectConfig({ graphql, projectOwner: 'my-org', projectNumber: 1 }),
    /Missing project field: Status/
  );
});

test('validateProjectConfig throws when Status field is not single-select', async () => {
  const project = makeProject({
    fields: {
      nodes: [
        { id: 'f1', name: 'Status' }, // no options → not single-select
        { id: 'f2', name: 'Priority', options: [{ id: 'o5', name: 'P0' }, { id: 'o6', name: 'P1' }, { id: 'o7', name: 'P2' }] },
        { id: 'f3', name: 'Workstream', options: [] },
      ],
    },
  });
  const graphql = makeGraphql(project);
  await assert.rejects(
    () => validateProjectConfig({ graphql, projectOwner: 'my-org', projectNumber: 1 }),
    /must be a single-select field/
  );
});

test('validateProjectConfig throws when Status options are incomplete', async () => {
  const project = makeProject({
    fields: {
      nodes: [
        { id: 'f1', name: 'Status', options: [{ id: 'o1', name: 'Todo' }] },
        { id: 'f2', name: 'Priority', options: [{ id: 'o5', name: 'P0' }, { id: 'o6', name: 'P1' }, { id: 'o7', name: 'P2' }] },
        { id: 'f3', name: 'Workstream', options: [] },
      ],
    },
  });
  const graphql = makeGraphql(project);
  await assert.rejects(
    () => validateProjectConfig({ graphql, projectOwner: 'my-org', projectNumber: 1 }),
    /Field "Status" is missing options/
  );
});

test('validateProjectConfig throws when Priority options are incomplete', async () => {
  const project = makeProject({
    fields: {
      nodes: [
        {
          id: 'f1',
          name: 'Status',
          options: [
            { id: 'o1', name: 'Todo' },
            { id: 'o2', name: 'In Progress' },
            { id: 'o3', name: 'Blocked' },
            { id: 'o4', name: 'Done' },
          ],
        },
        { id: 'f2', name: 'Priority', options: [{ id: 'o5', name: 'P0' }] },
        { id: 'f3', name: 'Workstream', options: [] },
      ],
    },
  });
  const graphql = makeGraphql(project);
  await assert.rejects(
    () => validateProjectConfig({ graphql, projectOwner: 'my-org', projectNumber: 1 }),
    /Field "Priority" is missing options/
  );
});

test('validateProjectConfig respects custom field names from projectFields', async () => {
  const project = makeProject({
    fields: {
      nodes: [
        {
          id: 'f1',
          name: 'Task Status',
          options: [
            { id: 'o1', name: 'Todo' },
            { id: 'o2', name: 'In Progress' },
            { id: 'o3', name: 'Blocked' },
            { id: 'o4', name: 'Done' },
          ],
        },
        {
          id: 'f2',
          name: 'Task Priority',
          options: [{ id: 'o5', name: 'P0' }, { id: 'o6', name: 'P1' }, { id: 'o7', name: 'P2' }],
        },
        { id: 'f3', name: 'Stream', options: [] },
      ],
    },
  });
  const graphql = makeGraphql(project);
  const result = await validateProjectConfig({
    graphql,
    projectOwner: 'my-org',
    projectNumber: 1,
    projectFields: { status: 'Task Status', priority: 'Task Priority', workstream: 'Stream' },
  });
  assert.equal(result.title, 'Test Project');
});
