import { nhost } from '@/lib/nhostClient';
import { graphql } from '@/lib/graphql';

type FunctionEnvelope<T> = { data?: T } | T;

export async function previewImport(params: {
  csvText: string;
  schoolId?: string;
  schemaVersion?: string;
  deactivateMissing?: boolean;
  sourceRef?: string;
}) {
  const { res, error } = await nhost.functions.call('preview-school-directory-import', params);
  if (error) throw error;

  const payload = (res as FunctionEnvelope<{ ok: boolean }>).data ?? (res as FunctionEnvelope<{ ok: boolean }>);
  return payload;
}

export async function applyPreview(previewId: string) {
  const { res, error } = await nhost.functions.call('apply-school-directory-preview', { previewId });
  if (error) throw error;

  const payload = (res as FunctionEnvelope<{ ok: boolean }>).data ?? (res as FunctionEnvelope<{ ok: boolean }>);
  return payload;
}

export async function getPreview(previewId: string) {
  const data = await graphql(
    `
    query DirectoryImportPreview($id: uuid!) {
      directory_import_previews_by_pk(id: $id) {
        id
        actor_id
        school_id
        district_id
        source_id
        source_ref
        source_hash
        schema_version
        created_at
        expires_at
        applied_at
        deactivate_missing
        diff
        stats
        errors
      }
    }
  `,
    { id: previewId }
  );

  return data?.directory_import_previews_by_pk;
}
