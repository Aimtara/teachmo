import process from 'process';
import { loadIssuePack, markerFor } from './issue-pack-core.mjs';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function hasAnyIssuePackMarker(body = '') {
  return body.includes('<!-- issue-pack-key:');
}

function main() {
  const pack = loadIssuePack();

  // GitHub Project v2 integration is optional. When owner + number are both
  // present, all project field mappings and child project_fields are required.
  const projectOwner = pack?.meta?.project?.owner;
  const projectNumber = pack?.meta?.project?.number;
  const hasProject = Boolean(projectOwner && projectNumber);

  assert(!projectOwner || projectNumber, 'meta.project.number is required when meta.project.owner is set');
  assert(!projectNumber || projectOwner, 'meta.project.owner is required when meta.project.number is set');

  if (hasProject) {
    const fields = pack?.meta?.project?.fields || {};
    assert(fields.status, 'meta.project.fields.status is required when project is configured');
    assert(fields.priority, 'meta.project.fields.priority is required when project is configured');
    assert(fields.workstream, 'meta.project.fields.workstream is required when project is configured');
  }

  const globals = new Set(pack?.meta?.global_labels || []);
  assert(globals.has('in-progress'), 'meta.global_labels must include in-progress');
  assert(globals.has('blocked'), 'meta.global_labels must include blocked');

  assert(pack?.parent?.key, 'parent.key is required');
  assert((pack.parent.body || '').includes(markerFor(pack.parent.key)), 'parent body is missing issue-pack marker');

  for (const child of pack.children || []) {
    assert(child.key, 'every child.key is required');
    assert(child.title, `child ${child.key} is missing title`);
    assert((child.body || '').includes(markerFor(child.key)), `child ${child.key} is missing issue-pack marker in body`);

    if (hasProject) {
      const projectFields = child.project_fields || {};
      assert(projectFields.status, `child ${child.key} missing project_fields.status`);
      assert(projectFields.priority, `child ${child.key} missing project_fields.priority`);
      assert(projectFields.workstream, `child ${child.key} missing project_fields.workstream`);
    }
  }

  console.log(`Issue pack validation passed (${(pack.children || []).length} children).`);
}

main();
