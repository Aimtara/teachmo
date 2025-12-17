import { nhost } from '@/lib/nhostClient';

export type InviteResult = {
  email: string;
  status: 'added_existing_user' | 'invited_new_user';
  inviteUrl?: string;
};

type FunctionEnvelope<T> = { data?: T } | T;

type CreateThreadInviteResponse = FunctionEnvelope<{
  ok: boolean;
  results: InviteResult[];
}>;

type AcceptInviteResponse = FunctionEnvelope<{
  ok: boolean;
  threadId: string | null;
}>;

export async function createThreadInvites(input: { threadId: string; emails: string[] }) {
  const { res, error } = await nhost.functions.call('create-thread-invites', input);
  if (error) throw error;

  const payload = (res as CreateThreadInviteResponse)?.data ?? (res as CreateThreadInviteResponse);
  return payload;
}

export async function acceptThreadInvite(token: string) {
  const { res, error } = await nhost.functions.call('accept-thread-invite', { token });
  if (error) throw error;

  const payload = (res as AcceptInviteResponse)?.data ?? (res as AcceptInviteResponse);
  return payload;
}
