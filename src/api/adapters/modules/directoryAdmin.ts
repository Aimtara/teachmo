import { graphql } from '@/lib/graphql';
import { nhost } from '@/lib/nhostClient';

type FunctionEnvelope<T> = { data?: T } | T;

export type DirectoryImportStats = {
  totalRows?: number;
  totalValid?: number;
  invalid?: number;
  upserted?: number;
  deactivated?: number;
  deactivateMissing?: boolean;
  dryRun?: boolean;
};

export type DirectoryImportJob = {
  id: string;
  actor_id: string;
  school_id: string;
  district_id?: string | null;
  source_type: string;
  source_ref?: string | null;
  source_hash: string;
  status: string;
  started_at: string;
  finished_at?: string | null;
  stats?: DirectoryImportStats;
  errors?: Array<{ reason?: string; message?: string; row?: number }>;
};

export async function importDirectoryCsv(params: {
  csvText: string;
  schoolId?: string;
  deactivateMissing?: boolean;
  dryRun?: boolean;
  sourceRef?: string;
}) {
  const { res, error } = await nhost.functions.call('import-school-directory-csv', params);
  if (error) throw error;

  const payload = (res as FunctionEnvelope<{ ok: boolean }>).data ?? (res as FunctionEnvelope<{ ok: boolean }>);
  return payload;
}

export async function getDirectoryImportJobs(params: { schoolId?: string }) {
  const { res, error } = await nhost.functions.call('get-directory-import-jobs', params);
  if (error) throw error;

  const payload = (res as FunctionEnvelope<{ ok: boolean; jobs: DirectoryImportJob[] }>).data ??
    (res as FunctionEnvelope<{ ok: boolean; jobs: DirectoryImportJob[] }>);

  return payload;
}

export async function getDirectoryImportJob(jobId: string) {
  const data = await graphql(
    `
    query DirectoryImportJob($id: uuid!) {
      directory_import_jobs_by_pk(id: $id) {
        id
        actor_id
        school_id
        district_id
        source_type
        source_ref
        source_hash
        status
        started_at
        finished_at
        stats
        errors
      }
    }
  `,
    { id: jobId }
  );

  return data?.directory_import_jobs_by_pk ?? null;
}
