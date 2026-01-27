import { nhost } from '@/lib/nhostClient';
import * as DirectorySourcesAdminAPI from './directorySourcesAdmin';

type FunctionEnvelope<T> = { data?: T } | T;

type OpsSummaryParams = { schoolId?: string; districtId?: string };

type OpsSummaryResult = {
  summary?: unknown;
  [key: string]: unknown;
};

export async function getOpsSummary(params: OpsSummaryParams = {}) {
  const { res, error } = await nhost.functions.call('get-directory-ops-summary', params);
  if (error) throw error;

  const payload = (res as FunctionEnvelope<OpsSummaryResult>).data ?? (res as FunctionEnvelope<OpsSummaryResult>);
  return payload.summary ?? payload;
}

export async function syncSource(sourceId: string, options: { deactivateMissing?: boolean; dryRun?: boolean } = {}) {
  return DirectorySourcesAdminAPI.syncSource(sourceId, options);
}

export function openApproval(approvalId: string) {
  return `/admin/directory-approvals/${approvalId}`;
}
