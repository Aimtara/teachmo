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

  assert(pack?.meta?.project?.owner, 'meta.project.owner is required');
  assert(pack?.meta?.project?.number, 'meta.project.number is required');

  const fields = pack?.meta?.project?.fields || {};
  assert(fields.status, 'meta.project.fields.status is required');
  assert(fields.priority, 'meta.project.fields.priority is required');
  assert(fields.workstream, 'meta.project.fields.workstream is required');

  const globals = new Set(pack?.meta?.global_labels || []);
  assert(globals.has('in-progress'), 'meta.global_labels must include in-progress');
  assert(globals.has('blocked'), 'meta.global_labels must include blocked');

  assert(pack?.parent?.key, 'parent.key is required');
  assert((pack.parent.body || '').includes(markerFor(pack.parent.key)), 'parent body is missing issue-pack marker');

  for (const child of pack.children || []) {
    assert(child.key, 'every child.key is required');
    assert(child.title, `child ${child.key} is missing title`);
    assert((child.body || '').includes(markerFor(child.key)), `child ${child.key} is missing issue-pack marker in body`);

    const projectFields = child.project_fields || {};
    assert(projectFields.status, `child ${child.key} missing project_fields.status`);
    assert(projectFields.priority, `child ${child.key} missing project_fields.priority`);
    assert(projectFields.workstream, `child ${child.key} missing project_fields.workstream`);
  }

  console.log(`Issue pack validation passed (${(pack.children || []).length} children).`);
}

main();
