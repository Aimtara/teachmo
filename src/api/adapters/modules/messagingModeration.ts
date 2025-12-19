import { nhost } from '@/lib/nhostClient';

type FunctionEnvelope<T> = { data?: T } | T;

type ReportResponse = FunctionEnvelope<{ ok: boolean; reportId?: string | null }>;
type GenericResponse = FunctionEnvelope<{ ok: boolean }>;

export async function reportMessage(input: { threadId: string; messageId?: string; reason: string; detail?: string }) {
  const { res, error } = await nhost.functions.call('report-message', input);
  if (error) throw error;
  const payload = (res as ReportResponse)?.data ?? (res as ReportResponse);
  return payload;
}

export async function triageReport(input: {
  reportId: string;
  status: 'triaged' | 'resolved' | 'dismissed';
  severity: 'low' | 'medium' | 'high';
  adminNote?: string;
  action?: 'none' | 'close_thread' | 'block_user' | 'lift_block';
  blockedUserId?: string;
}) {
  const { res, error } = await nhost.functions.call('triage-message-report', input);
  if (error) throw error;
  const payload = (res as GenericResponse)?.data ?? (res as GenericResponse);
  return payload;
}

export async function blockUser(input: { schoolId: string; blockedUserId: string; reason?: string }) {
  const { res, error } = await nhost.functions.call('block-user-from-messaging', input);
  if (error) throw error;
  const payload = (res as GenericResponse)?.data ?? (res as GenericResponse);
  return payload;
}

export async function liftBlock(input: { blockId: string }) {
  const { res, error } = await nhost.functions.call('lift-messaging-block', input);
  if (error) throw error;
  const payload = (res as GenericResponse)?.data ?? (res as GenericResponse);
  return payload;
}

export async function listReports(input: { status?: string } = {}) {
  const { res, error } = await nhost.functions.call('get-open-message-reports', input);
  if (error) throw error;
  return (res as any)?.data?.reports ?? (res as any)?.reports ?? [];
}

export async function listBlocks() {
  const { res, error } = await nhost.functions.call('list-message-blocks', {});
  if (error) throw error;
  return (res as any)?.data?.blocks ?? (res as any)?.blocks ?? [];
}

export async function exportTranscript(input: { threadId: string }) {
  const { res, error } = await nhost.functions.call('export-thread-transcript', input);
  if (error) throw error;
  return (res as any)?.data ?? res;
}
