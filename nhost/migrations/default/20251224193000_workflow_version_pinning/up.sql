-- Adds optional pinning of a workflow definition to a specific historical version.
-- When pinned_version is set, the runtime should execute the snapshot from
-- workflow_definition_versions rather than the latest workflow_definitions.definition.

alter table if exists public.workflow_definitions
  add column if not exists pinned_version integer;

comment on column public.workflow_definitions.pinned_version is
  'If set, runtime executes this snapshot version from workflow_definition_versions.';
