import { HasuraClient } from '../directoryImportCore';

export type DirectorySourceCursor = {
  id: string;
  source_id: string;
  last_full_sync_at?: string | null;
  last_delta_sync_at?: string | null;
  last_success_run_id?: string | null;
  oneroster_last_delta_datetime?: string | null;
  clever_last_event_id?: string | null;
  clever_last_event_created?: string | null;
};

export async function getCursor(hasura: HasuraClient, sourceId: string) {
  const resp = await hasura(
    `query GetCursor($sourceId: uuid!) {
      directory_source_cursors(where: { source_id: { _eq: $sourceId } }, limit: 1) {
        id
        source_id
        last_full_sync_at
        last_delta_sync_at
        last_success_run_id
        oneroster_last_delta_datetime
        clever_last_event_id
        clever_last_event_created
      }
    }`,
    { sourceId }
  );

  const cursor = resp?.data?.directory_source_cursors?.[0] ?? null;
  return cursor as DirectorySourceCursor | null;
}

export async function initCursorIfMissing(hasura: HasuraClient, sourceId: string) {
  const existing = await getCursor(hasura, sourceId);
  if (existing) return existing;

  const insert = await hasura(
    `mutation InitCursor($sourceId: uuid!) {
      insert_directory_source_cursors_one(object: { source_id: $sourceId }) {
        id
        source_id
        last_full_sync_at
        last_delta_sync_at
        last_success_run_id
        oneroster_last_delta_datetime
        clever_last_event_id
        clever_last_event_created
      }
    }`,
    { sourceId }
  );

  return insert?.data?.insert_directory_source_cursors_one as DirectorySourceCursor;
}

export async function updateCursor(hasura: HasuraClient, sourceId: string, patch: Partial<DirectorySourceCursor>) {
  const update = await hasura(
    `mutation UpdateCursor($sourceId: uuid!, $patch: directory_source_cursors_set_input!) {
      update_directory_source_cursors(where: { source_id: { _eq: $sourceId } }, _set: $patch) {
        returning {
          id
          source_id
          last_full_sync_at
          last_delta_sync_at
          last_success_run_id
          oneroster_last_delta_datetime
          clever_last_event_id
          clever_last_event_created
        }
      }
    }`,
    { sourceId, patch }
  );

  return update?.data?.update_directory_source_cursors?.returning?.[0] as DirectorySourceCursor;
}

export async function markFullSync(hasura: HasuraClient, sourceId: string, runId: string | null) {
  const nowIso = new Date().toISOString();
  return updateCursor(hasura, sourceId, {
    last_full_sync_at: nowIso,
    last_success_run_id: runId,
  });
}

export async function markDeltaSync(hasura: HasuraClient, sourceId: string, runId: string | null) {
  const nowIso = new Date().toISOString();
  return updateCursor(hasura, sourceId, {
    last_delta_sync_at: nowIso,
    last_success_run_id: runId,
  });
}
