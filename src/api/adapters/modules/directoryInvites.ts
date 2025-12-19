import { nhost } from '@/lib/nhostClient';

type FunctionEnvelope<T> = { data?: T } | T;

export type InviteCreateResult = {
  ok: boolean;
  inviteId?: string;
  status?: string;
  expiresAt?: string;
  reason?: string;
};

export type ClaimContext = {
  ok: boolean;
  valid?: boolean;
  email?: string;
  schoolId?: string;
  districtId?: string | null;
  status?: string | null;
  expiresAt?: string | null;
};

export type ClaimInviteResult = {
  ok: boolean;
  schoolId?: string;
  linked?: boolean;
  reason?: string;
};

export async function createDirectoryInvite(params: { schoolId: string; email: string; role?: string; districtId?: string }) {
  const { res, error } = await nhost.functions.call('create-invite', params);
  if (error) throw error;

  const payload = (res as FunctionEnvelope<InviteCreateResult>)?.data ?? (res as FunctionEnvelope<InviteCreateResult>);
  return payload;
}

export async function getClaimContext(token: string) {
  const { res, error } = await nhost.functions.call('get-claim-context', { token });
  if (error) throw error;

  const payload = (res as FunctionEnvelope<ClaimContext>)?.data ?? (res as FunctionEnvelope<ClaimContext>);
  return payload;
}

export async function claimInvite(token: string) {
  const { res, error } = await nhost.functions.call('claim-invite', { token });
  if (error) throw error;

  const payload = (res as FunctionEnvelope<ClaimInviteResult>)?.data ?? (res as FunctionEnvelope<ClaimInviteResult>);
  return payload;
}
