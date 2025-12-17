import { nhost } from '@/lib/nhostClient';

type FunctionEnvelope<T> = { data?: T } | T;

export type InviteSummary = {
  id: string;
  emailMasked: string;
  expiresAt: string | null;
  acceptedAt: string | null;
  revokedAt: string | null;
  lastSentAt: string | null;
  sendCount: number | null;
};

export async function listThreadInvites(threadId: string) {
  const { res, error } = await nhost.functions.call('list-thread-invites', { threadId });
  if (error) throw error;

  const payload = (res as FunctionEnvelope<{ ok: boolean; invites: InviteSummary[] }>)?.data ??
    (res as FunctionEnvelope<{ ok: boolean; invites: InviteSummary[] }>);

  return payload?.invites ?? [];
}

export async function resendThreadInvite(inviteId: string) {
  const { res, error } = await nhost.functions.call('resend-thread-invite', { inviteId });
  if (error) throw error;

  return (res as FunctionEnvelope<{ ok: boolean }> )?.data ?? (res as FunctionEnvelope<{ ok: boolean }>);
}

export async function revokeThreadInvite(inviteId: string, reason?: string) {
  const { res, error } = await nhost.functions.call('revoke-thread-invite', { inviteId, reason });
  if (error) throw error;

  return (res as FunctionEnvelope<{ ok: boolean }>)?.data ?? (res as FunctionEnvelope<{ ok: boolean }>);
}
