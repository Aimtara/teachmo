import { graphql } from '@/lib/graphql';
import { nhost } from '@/lib/nhostClient';

type FunctionEnvelope<T> = { data?: T } | T;

const SOURCE_FIELDS = `
  id
  name
  school_id
  district_id
  source_type
  is_enabled
  config
  schedule_cron
  schedule_tz
  last_run_at
  created_at
  updated_at
`;

export async function listSources() {
  const data = await graphql(
    `query DirectorySources {
      directory_sources(order_by: { created_at: desc }) { ${SOURCE_FIELDS} }
    }`
  );
  return data?.directory_sources ?? [];
}

export async function createSource(input: Record<string, any>) {
  const data = await graphql(
    `mutation CreateDirectorySource($object: directory_sources_insert_input!) {
      insert_directory_sources_one(object: $object) { ${SOURCE_FIELDS} }
    }`,
    { object: input }
  );

  return data?.insert_directory_sources_one ?? null;
}

export async function updateSource(id: string, changes: Record<string, any>) {
  const data = await graphql(
    `mutation UpdateDirectorySource($id: uuid!, $changes: directory_sources_set_input!) {
      update_directory_sources_by_pk(pk_columns: { id: $id }, _set: $changes) { ${SOURCE_FIELDS} }
    }`,
    { id, changes }
  );

  return data?.update_directory_sources_by_pk ?? null;
}

export async function syncSource(sourceId: string, options: { deactivateMissing?: boolean; dryRun?: boolean } = {}) {
  const { res, error } = await nhost.functions.call('sync-directory-source', { sourceId, ...options });
  if (error) throw error;

  const payload = (res as FunctionEnvelope<any>)?.data ?? (res as any);
  return payload;
}

export async function listRuns(sourceId: string) {
  const data = await graphql(
    `query Runs($sourceId: uuid!) {
      directory_source_runs(where: { source_id: { _eq: $sourceId } }, order_by: { started_at: desc }, limit: 10) {
        id
        status
        started_at
        finished_at
        job_id
        stats
        errors
      }
    }`,
    { sourceId }
  );

  return data?.directory_source_runs ?? [];
}
